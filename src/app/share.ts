import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// The Android app's WebView has no navigator.share and can't download blob links, so there the share
// sheet comes from the Capacitor Share plugin (INV-2, PDF-4).
const native = Capacitor.isNativePlatform();

/** Opens the share sheet with `text`. False when this device has none (the caller copies instead). */
export async function shareText(text: string): Promise<boolean> {
  if (native) {
    // A real failure (not a cancel) falls back to copying, like a device without a share sheet.
    if (!(await Share.share({ text }).then(() => true, isCancel))) return false;
  } else if (navigator.share) await navigator.share({ text }).catch(() => {});
  else return false;
  return true;
}

/** PDF-4: the share sheet (save, send…) where files can be shared, otherwise a download. */
export async function shareFile(blob: Blob, name: string, title: string) {
  if (native) {
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: await base64(blob),
      directory: Directory.Cache,
    });
    await Share.share({ files: [uri], title }).catch((e: unknown) => {
      if (!isCancel(e)) throw e; // PDF-5: the caller shows the failure
    });
    return;
  }
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // The user closed the share sheet.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** True for the plugin's "the user closed the sheet" rejection, which isn't a failure. */
function isCancel(e: unknown) {
  return (e as Error)?.message === "Share canceled";
}

function base64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]!);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
