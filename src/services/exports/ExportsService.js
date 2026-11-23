import { Platform } from "react-native";
import ReactNativeBlobUtil from "react-native-blob-util";
import { BASE_URL } from "../../constant/url";
import { DOWNLOADNETWORK, getAuthBearerToken } from "../../utils/Network";

const REPORT_TYPES = {
    xlsx: {
        path: "exports/summary.xlsx",
        accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ext: "xlsx",
        label: "Excel",
    },
    pdf: {
        path: "exports/summary.pdf",
        accept: "application/pdf",
        mime: "application/pdf",
        ext: "pdf",
        label: "PDF",
    },
};

const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = String(reader.result || "");
            const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
            if (!base64) {
                reject(new Error("Unable to read downloaded file"));
                return;
            }
            resolve(base64);
        };
        reader.onerror = () => reject(new Error("Unable to read downloaded file"));
        reader.readAsDataURL(blob);
    });

const buildFileName = (ext) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return `PKMD_Summary_${stamp}.${ext}`;
};

/**
 * Download summary report (Excel/PDF) using login Bearer token.
 * Saves into the device Downloads folder and shows the system download notification on Android.
 */
export const downloadSummaryReport = async (format = "xlsx") => {
    const key = String(format || "xlsx").toLowerCase() === "pdf" ? "pdf" : "xlsx";
    const meta = REPORT_TYPES[key];
    const url = `${BASE_URL}${meta.path}`;
    const fileName = buildFileName(meta.ext);
    const token = await getAuthBearerToken();

    if (!token) {
        return { ok: false, message: "Please login again to download reports" };
    }

    // Prefetch via DOWNLOADNETWORK (same auth pattern as GETNETWORK) to surface API errors cleanly.
    const probe = await DOWNLOADNETWORK(url, true, meta.accept);
    if (!probe.ok) {
        return {
            ok: false,
            message: probe.message || `${meta.label} report download failed`,
            status: probe.status,
        };
    }
    if (!probe.blob) {
        return { ok: false, message: `${meta.label} report was empty` };
    }

    try {
        const base64 = await blobToBase64(probe.blob);
        const dirs = ReactNativeBlobUtil.fs.dirs;
        const downloadDir = dirs.DownloadDir || dirs.DocumentDir;
        const filePath = `${downloadDir}/${fileName}`;

        await ReactNativeBlobUtil.fs.writeFile(filePath, base64, "base64");

        if (Platform.OS === "android") {
            try {
                await ReactNativeBlobUtil.android.addCompleteDownload({
                    title: fileName,
                    description: `PKMD ${meta.label} summary report`,
                    mime: meta.mime,
                    path: filePath,
                    showNotification: true,
                    mediaScannable: true,
                });
            } catch (_) {
                // File is still saved even if the system notification fails.
            }
        }

        return {
            ok: true,
            path: filePath,
            fileName,
            format: key,
            message: `${meta.label} report saved to Downloads`,
        };
    } catch (error) {
        // Fallback: stream again with DownloadManager (shows notification while downloading).
        try {
            const androidPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;
            const res = await ReactNativeBlobUtil.config({
                fileCache: true,
                path: androidPath,
                addAndroidDownloads: {
                    useDownloadManager: true,
                    notification: true,
                    title: fileName,
                    description: `Downloading PKMD ${meta.label} summary`,
                    mime: meta.mime,
                    mediaScannable: true,
                    path: androidPath,
                },
            }).fetch("GET", url, {
                Authorization: `Bearer ${token}`,
                Accept: meta.accept,
            });

            const status = res.info()?.status;
            if (status && status >= 400) {
                return {
                    ok: false,
                    message: `${meta.label} report download failed (${status})`,
                    status,
                };
            }

            return {
                ok: true,
                path: res.path(),
                fileName,
                format: key,
                message: `${meta.label} report saved to Downloads`,
            };
        } catch (fallbackError) {
            return {
                ok: false,
                message:
                    fallbackError?.message ||
                    error?.message ||
                    `${meta.label} report download failed`,
            };
        }
    }
};

export const EXPORT_REPORT_OPTIONS = [
    {
        key: "xlsx",
        title: "Excel Report",
        subtitle: "Download .xlsx summary file",
    },
    {
        key: "pdf",
        title: "PDF Report",
        subtitle: "Download .pdf summary file",
    },
];
