use std::fs;
use std::process::Command;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use sha2::{Sha256, Digest};
use ed25519_dalek::{VerifyingKey, Signature, Verifier};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use chrono::{TimeZone, Utc};
use tauri::Manager;

const PUBLIC_KEY_BYTES: [u8; 32] = [
    0xec, 0xfb, 0x81, 0x59, 0xd1, 0x9c, 0x88, 0xb1, 0x9d, 0x1a, 0x81, 0x97, 0x69, 0xc7, 0x23, 0x75,
    0x31, 0xfd, 0xa0, 0x6f, 0xe5, 0xf2, 0x97, 0x95, 0x24, 0x9d, 0x93, 0x46, 0xa2, 0xe7, 0x32, 0x4f
];

#[derive(serde::Serialize, Clone)]
pub struct LicenseInfo {
    pub active: bool,
    pub hwid: String,
    pub expires_at: String,
    pub days_remaining: i64,
}

fn hash_sha256(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

#[cfg(target_os = "windows")]
fn get_windows_uuid() -> Result<String, String> {
    let output = Command::new("powershell")
        .args(&[
            "-NoProfile",
            "-Command",
            "Get-CimInstance -ClassName Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let uuid = stdout.trim().to_string();
    if uuid.is_empty() {
        return Err("Empty UUID returned".to_string());
    }
    Ok(uuid)
}

pub fn get_hardware_id() -> Result<String, String> {
    let raw_uuid = {
        #[cfg(target_os = "windows")]
        {
            get_windows_uuid()
        }
        #[cfg(target_os = "macos")]
        {
            let output = Command::new("sh")
                .args(&["-c", "system_profiler SPHardwareDataType | awk '/Hardware UUID/ {print $3}'"])
                .output()
                .map_err(|e| e.to_string())?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let uuid = stdout.trim().to_string();
            if uuid.is_empty() {
                return Err("Empty UUID".to_string());
            }
            Ok(uuid)
        }
        #[cfg(target_os = "linux")]
        {
            std::fs::read_to_string("/sys/class/dmi/id/product_uuid")
                .map(|s| s.trim().to_string())
                .map_err(|e| e.to_string())
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Err("Unsupported OS".to_string())
        }
    };

    let id = match raw_uuid {
        Ok(uuid) => uuid,
        Err(_) => {
            // Fallback
            let computername = std::env::var("COMPUTERNAME")
                .or_else(|_| std::env::var("HOSTNAME"))
                .unwrap_or_else(|_| "unknown_host".to_string());
            let username = std::env::var("USERNAME")
                .or_else(|_| std::env::var("USER"))
                .unwrap_or_else(|_| "unknown_user".to_string());
            format!("{}-{}", computername, username)
        }
    };

    Ok(hash_sha256(&id))
}

pub fn verify_license_key(key: &str, system_hwid: &str) -> Result<u64, String> {
    let decoded_bytes = STANDARD.decode(key.trim())
        .map_err(|_| "Invalid key format (not base64)".to_string())?;
    
    let decoded_str = String::from_utf8(decoded_bytes)
        .map_err(|_| "Invalid license key encoding".to_string())?;

    let parts: Vec<&str> = decoded_str.split('.').collect();
    if parts.len() != 2 {
        return Err("Invalid key structure".to_string());
    }

    let payload = parts[0];
    let signature_hex = parts[1];

    // Verify signature
    let signature_bytes = hex::decode(signature_hex)
        .map_err(|_| "Invalid signature encoding".to_string())?;
    
    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|_| "Invalid signature structure".to_string())?;

    let verifier = VerifyingKey::from_bytes(&PUBLIC_KEY_BYTES)
        .map_err(|_| "Failed to initialize verification key".to_string())?;

    verifier.verify(payload.as_bytes(), &signature)
        .map_err(|_| "License signature verification failed".to_string())?;

    // Parse payload: hwid:expires
    let payload_parts: Vec<&str> = payload.split(':').collect();
    if payload_parts.len() != 2 {
        return Err("Invalid payload structure".to_string());
    }

    let license_hwid = payload_parts[0];
    let expires_str = payload_parts[1];

    if license_hwid != system_hwid {
        return Err("License key is for a different hardware ID".to_string());
    }

    let expires = expires_str.parse::<u64>()
        .map_err(|_| "Invalid expiration timestamp".to_string())?;

    Ok(expires)
}

fn get_license_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app_handle.path().app_data_dir()
        .map_err(|_| "Failed to get app data directory".to_string())?;
    
    // Create directory if it doesn't exist
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    
    path.push("license.lic");
    Ok(path)
}

fn get_last_run_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app_handle.path().app_data_dir()
        .map_err(|_| "Failed to get app data directory".to_string())?;
    path.push("state.dat");
    Ok(path)
}

pub fn check_license_status(app_handle: &tauri::AppHandle) -> Result<LicenseInfo, String> {
    let hwid = get_hardware_id()?;
    let lic_path = get_license_file_path(app_handle)?;
    let last_run_path = get_last_run_file_path(app_handle)?;

    if !lic_path.exists() {
        return Ok(LicenseInfo {
            active: false,
            hwid,
            expires_at: "".to_string(),
            days_remaining: 0,
        });
    }

    let key = fs::read_to_string(&lic_path)
        .map_err(|e| e.to_string())?;

    let expires_timestamp = match verify_license_key(&key, &hwid) {
        Ok(t) => t,
        Err(_) => {
            return Ok(LicenseInfo {
                active: false,
                hwid,
                expires_at: "".to_string(),
                days_remaining: 0,
            });
        }
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Anti clock-tampering check
    let mut last_run = now;
    if last_run_path.exists() {
        if let Ok(content) = fs::read_to_string(&last_run_path) {
            if let Ok(saved_time) = content.trim().parse::<u64>() {
                if now < saved_time {
                    // Clock was set back!
                    return Ok(LicenseInfo {
                        active: false,
                        hwid,
                        expires_at: "Clock Tampering Detected".to_string(),
                        days_remaining: 0,
                    });
                }
                last_run = saved_time;
            }
        }
    }

    // Save the new current time (only if it's forward)
    if now > last_run {
        let _ = fs::write(&last_run_path, now.to_string());
    }

    if now >= expires_timestamp {
        return Ok(LicenseInfo {
            active: false,
            expires_at: Utc.timestamp_opt(expires_timestamp as i64, 0).unwrap().to_rfc3339(),
            hwid,
            days_remaining: 0,
        });
    }

    let seconds_left = expires_timestamp - now;
    let days_remaining = (seconds_left / 86400) as i64;

    Ok(LicenseInfo {
        active: true,
        expires_at: Utc.timestamp_opt(expires_timestamp as i64, 0).unwrap().to_rfc3339(),
        hwid,
        days_remaining,
    })
}

pub fn activate_license_key(app_handle: &tauri::AppHandle, key: String) -> Result<LicenseInfo, String> {
    let hwid = get_hardware_id()?;
    let lic_path = get_license_file_path(app_handle)?;

    // Verify key
    let _expires_timestamp = verify_license_key(&key, &hwid)?;

    // Save key
    fs::write(&lic_path, key.trim())
        .map_err(|e| e.to_string())?;

    check_license_status(app_handle)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signature() {
        let key = "MDU1YjQ4YTEwM2JmN2Y0ZDUyOTNlZDYzODQ1MWRhZjIzMjcyZDhmNTk2ZTc1MWM2NTNlNjQ1MmIzYzE0ZTkxNDoxODEzMTcwNTkxLjY0NTg4MjBhNDYwNzJjNjUwNDU2MWY5NWVhMzJhYzRkNzhhYzBiNGFlOTY0ZjVhM2NiYjVhMDg4MmJmMjY2OWU0Mzc0ZDE0MDczMDMyYjIyZjNkOGEwMTMyZjUxZDU5MGIyNTBjNWNiYzJhNDhhMzQyOTlhYWJhMWU3Njk3OTA2";
        let hwid = "055b48a103bf7f4d5293ed638451daf23272d8f596e751c653e6452b3c14e914";
        let res = verify_license_key(key, hwid);
        println!("Test verify result: {:?}", res);
        assert!(res.is_ok());
    }
}
