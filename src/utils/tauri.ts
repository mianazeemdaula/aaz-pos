/** Running inside the Tauri desktop shell rather than a plain browser. */
export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
