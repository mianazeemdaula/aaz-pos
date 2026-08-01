//! Local backup storage on the machine running the desktop app.
//!
//! `pg_dump` necessarily runs on the server, but the resulting file does not
//! have to stay there. The app streams the dump down over the existing
//! `GET /settings/backup` endpoint and these commands write it to a folder on
//! this PC — so a till keeps its own copy on its own disk (or a USB stick, or a
//! mapped network drive) without depending on anyone having access to the
//! server's filesystem.

use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Filenames the server produces: `pos-backup-<stamp>.dump` / `.sql`.
const BACKUP_PREFIX: &str = "pos-backup-";
const BACKUP_EXTENSIONS: [&str; 2] = ["dump", "sql"];

#[derive(Debug, Serialize)]
pub struct SavedBackup {
    pub path: String,
    pub filename: String,
    pub bytes: u64,
    /// Files deleted by the retention policy, for reporting.
    pub removed: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct LocalBackupInfo {
    pub filename: String,
    pub bytes: u64,
    /// RFC 3339 modification time.
    pub at: String,
}

/// True for files this app created, so retention can never touch anything else
/// living in a user-chosen folder such as Documents.
fn is_backup_file(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
        return false;
    };
    if !name.starts_with(BACKUP_PREFIX) {
        return false;
    }
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| BACKUP_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn rfc3339(time: SystemTime) -> String {
    let dt: chrono::DateTime<chrono::Local> = time.into();
    dt.to_rfc3339()
}

/// Open a native folder picker. `None` when the user cancels.
#[tauri::command]
pub fn pick_backup_dir(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    // Commands run off the main thread, which is what `blocking_*` requires.
    let picked = app
        .dialog()
        .file()
        .set_title("Choose a backup folder on this PC")
        .blocking_pick_folder();

    Ok(picked.map(|p| p.to_string()))
}

/// Create the folder if needed and prove it is writable, so a bad path is
/// reported when it is chosen rather than at closing time.
#[tauri::command]
pub fn validate_backup_dir(dir: String) -> Result<String, String> {
    let path = PathBuf::from(dir.trim());
    if path.as_os_str().is_empty() {
        return Err("No folder selected".to_string());
    }

    fs::create_dir_all(&path)
        .map_err(|e| format!("Cannot create folder '{}': {}", path.display(), e))?;

    let probe = path.join(".aazify-write-test");
    fs::write(&probe, b"ok")
        .map_err(|e| format!("Folder '{}' is not writable: {}", path.display(), e))?;
    let _ = fs::remove_file(&probe);

    Ok(path.to_string_lossy().to_string())
}

/// Write a downloaded dump into the folder and prune old ones.
///
/// `keep` is the number of backups to retain; 0 disables pruning.
#[tauri::command]
pub fn save_backup(
    dir: String,
    filename: String,
    data_base64: String,
    keep: usize,
) -> Result<SavedBackup, String> {
    let dir_path = PathBuf::from(dir.trim());
    fs::create_dir_all(&dir_path)
        .map_err(|e| format!("Cannot create folder '{}': {}", dir_path.display(), e))?;

    // Never let a server-supplied name escape the chosen folder.
    let safe_name = Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty())
        .ok_or_else(|| format!("Invalid backup filename '{}'", filename))?
        .to_string();

    let bytes = general_purpose::STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("Backup data was not valid base64: {}", e))?;

    if bytes.is_empty() {
        return Err("Backup is empty - refusing to write it".to_string());
    }

    // Do not clobber an existing backup taken in the same second.
    let mut target = dir_path.join(&safe_name);
    if target.exists() {
        let stem = Path::new(&safe_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("pos-backup")
            .to_string();
        let ext = Path::new(&safe_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("dump")
            .to_string();
        for n in 2.. {
            let candidate = dir_path.join(format!("{}-{}.{}", stem, n, ext));
            if !candidate.exists() {
                target = candidate;
                break;
            }
        }
    }

    // Write to a temp name first, then rename: a crash mid-write leaves a
    // partial `.part` rather than a backup that looks complete but is not.
    let temp = target.with_extension("part");
    fs::write(&temp, &bytes)
        .map_err(|e| format!("Cannot write backup to '{}': {}", temp.display(), e))?;
    fs::rename(&temp, &target).map_err(|e| {
        let _ = fs::remove_file(&temp);
        format!("Cannot finalise backup '{}': {}", target.display(), e)
    })?;

    let removed = apply_retention(&dir_path, keep)?;

    Ok(SavedBackup {
        path: target.to_string_lossy().to_string(),
        filename: target
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or(safe_name),
        bytes: bytes.len() as u64,
        removed,
    })
}

/// Keep the newest `keep` backups, delete the rest. `keep == 0` keeps everything.
fn apply_retention(dir: &Path, keep: usize) -> Result<Vec<String>, String> {
    if keep == 0 {
        return Ok(Vec::new());
    }

    let mut backups: Vec<(SystemTime, PathBuf)> = fs::read_dir(dir)
        .map_err(|e| format!("Cannot list '{}': {}", dir.display(), e))?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_backup_file(path))
        .filter_map(|path| {
            let modified = fs::metadata(&path).and_then(|m| m.modified()).ok()?;
            Some((modified, path))
        })
        .collect();

    if backups.len() <= keep {
        return Ok(Vec::new());
    }

    // Newest first, so everything past `keep` is the oldest.
    backups.sort_by(|a, b| b.0.cmp(&a.0));

    let mut removed = Vec::new();
    for (_, path) in backups.into_iter().skip(keep) {
        if fs::remove_file(&path).is_ok() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                removed.push(name.to_string());
            }
        }
    }
    Ok(removed)
}

/// Most recent backup in the folder, for the "last backup" line in Settings.
#[tauri::command]
pub fn latest_local_backup(dir: String) -> Result<Option<LocalBackupInfo>, String> {
    let dir_path = PathBuf::from(dir.trim());
    if !dir_path.is_dir() {
        return Ok(None);
    }

    let newest = fs::read_dir(&dir_path)
        .map_err(|e| format!("Cannot list '{}': {}", dir_path.display(), e))?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_backup_file(path))
        .filter_map(|path| {
            let meta = fs::metadata(&path).ok()?;
            let modified = meta.modified().ok()?;
            Some((modified, meta.len(), path))
        })
        .max_by_key(|(modified, _, _)| *modified);

    Ok(newest.map(|(modified, bytes, path)| LocalBackupInfo {
        filename: path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        bytes,
        at: rfc3339(modified),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_recognises_this_apps_backups() {
        assert!(is_backup_file(Path::new("pos-backup-2026-08-01-04-21-26.sql")));
        assert!(is_backup_file(Path::new("pos-backup-2026-08-01-04-21-26.dump")));
        assert!(is_backup_file(Path::new("pos-backup-2026-08-01-04-21-26-2.dump")));

        // Anything else in a user's folder must be off limits to retention.
        assert!(!is_backup_file(Path::new("taxes-2025.sql")));
        assert!(!is_backup_file(Path::new("pos-backup-notes.txt")));
        assert!(!is_backup_file(Path::new("holiday.jpg")));
        assert!(!is_backup_file(Path::new("pos-backup-")));
    }

    #[test]
    fn retention_keeps_the_newest_and_ignores_strangers() {
        let dir = std::env::temp_dir().join(format!("aazify-retention-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        // Five backups plus one unrelated file the user owns.
        for n in 1..=5 {
            let p = dir.join(format!("pos-backup-2026-08-0{}-00-00-00.dump", n));
            fs::write(&p, b"x").unwrap();
            // Stagger mtimes so ordering is deterministic.
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        fs::write(dir.join("my-thesis.docx"), b"important").unwrap();

        let removed = apply_retention(&dir, 2).unwrap();
        assert_eq!(removed.len(), 3, "should delete all but the newest two");

        let left: Vec<String> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect();
        assert!(left.contains(&"my-thesis.docx".to_string()), "unrelated file must survive");
        assert_eq!(left.len(), 3, "two backups plus the unrelated file");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn retention_disabled_keeps_everything() {
        let dir = std::env::temp_dir().join(format!("aazify-keep0-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        for n in 1..=3 {
            fs::write(dir.join(format!("pos-backup-2026-08-0{}-00-00-00.sql", n)), b"x").unwrap();
        }
        assert!(apply_retention(&dir, 0).unwrap().is_empty());
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 3);
        let _ = fs::remove_dir_all(&dir);
    }
}
