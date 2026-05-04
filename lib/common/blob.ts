export const blobToFile = (blob: Blob, fileName: string) =>
    new File([blob], fileName, { lastModified: Date.now() });

export const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
    if ("arrayBuffer" in blob) {
        return blob.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target?.result) {
                reject(new Error("Couldn't convert blob to ArrayBuffer"));
                return;
            }
            resolve(event.target.result as ArrayBuffer);
        };
        reader.onerror = () => reject(reader.error as Error);
        reader.readAsArrayBuffer(blob);
    });
};

export const blobToDataURL = (file: Blob | File): Promise<string | null> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error as Error);
        reader.readAsDataURL(file);
    });

export const blobToText = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error as Error);
        reader.onabort = () => reject(new Error("Aborted"));
        reader.readAsText(blob);
    });
