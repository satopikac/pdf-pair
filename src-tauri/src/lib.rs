use std::path::Path;
use tauri::ipc::Response;

const MAX_PDF_BYTES: u64 = 1024 * 1024 * 1024;

#[cfg(target_os = "linux")]
fn preferred_appimage_backend(
    is_appimage: bool,
    session_type: Option<&str>,
) -> Option<&'static str> {
    (is_appimage && session_type.is_some_and(|value| value.eq_ignore_ascii_case("wayland")))
        .then_some("wayland,x11")
}

#[cfg(target_os = "linux")]
fn configure_appimage_backend() {
    let backend = preferred_appimage_backend(
        std::env::var_os("APPIMAGE").is_some(),
        std::env::var("XDG_SESSION_TYPE").ok().as_deref(),
    );
    if let Some(backend) = backend {
        // Tauri's AppImage launcher defaults GTK to X11. On a Wayland desktop this
        // forces WebKitGTK through XWayland and can cause severe canvas jank.
        // This runs before GTK/WebKit starts any threads.
        std::env::set_var("GDK_BACKEND", backend);
    }
}

#[tauri::command]
fn read_pdf(path: String) -> Result<Response, String> {
    let pdf_path = Path::new(&path);
    let is_pdf = pdf_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"));
    if !is_pdf {
        return Err("只能打开 PDF 文件".into());
    }

    let metadata = std::fs::metadata(pdf_path).map_err(|_| "文件不存在或无法读取")?;
    if !metadata.is_file() {
        return Err("所选路径不是文件".into());
    }
    if metadata.len() > MAX_PDF_BYTES {
        return Err("PDF 文件超过 1 GB 限制".into());
    }

    let bytes = std::fs::read(pdf_path).map_err(|_| "文件不存在或无法读取")?;
    Ok(Response::new(bytes))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    configure_appimage_backend();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_pdf])
        .run(tauri::generate_context!())
        .expect("error while running PDF Pair");
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::preferred_appimage_backend;

    #[test]
    fn appimage_prefers_native_wayland_with_x11_fallback() {
        assert_eq!(
            preferred_appimage_backend(true, Some("wayland")),
            Some("wayland,x11")
        );
        assert_eq!(preferred_appimage_backend(true, Some("x11")), None);
        assert_eq!(preferred_appimage_backend(false, Some("wayland")), None);
    }
}
