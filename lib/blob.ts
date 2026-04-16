export const blobToFile = (blob: Blob, fileName: string) =>
    new File([blob], fileName, { lastModified: Date.now() });

export const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
    if ("arrayBuffer" in blob) {
        return blob.arrayBuffer();
    }
    // Safari
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(
                    new Error("Couldn't convert blob to ArrayBuffer")
                );
            }
            resolve(event.target.result as ArrayBuffer);
        };
        reader.onerror = () => reject(reader.error as Error);
        reader.readAsArrayBuffer(blob);
    });
};

export const blobToDataURL = async (file: Blob | File) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataURL = reader.result;
            resolve(dataURL);
        };
        reader.onerror = () => reject(reader.error as Error);
        reader.readAsDataURL(file);
    });

export const blobToText = async (blob: Blob): Promise<string> =>
    await new Promise((resolve, reject) => {
        if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.onabort = (error) => {
                reject(error);
            };
            reader.readAsText(blob);
        }
    });
