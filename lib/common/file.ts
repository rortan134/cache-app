import {
    fileOpen as _fileOpen,
    fileSave as _fileSave,
} from "browser-fs-access";

const DEFAULT_FILE_MEDIA_TYPE = "application/octet-stream";

export const fileOpen = <M extends boolean | undefined = false>(options: {
    extensions?: string[];
    description: string;
    multiple?: M;
}) => {
    const extensions = options.extensions?.reduce((acc, ext) => {
        if (ext === "jpg") {
            return acc.concat(".jpg", ".jpeg");
        }
        return acc.concat(`.${ext}`);
    }, [] as string[]);

    return _fileOpen({
        description: options.description,
        extensions,
        multiple: options.multiple ?? false,
    });
};

export interface FileAttachment {
    file: File;
    filename: string;
    mediaType: string;
    type: "file";
    url: string;
}

function resolveFileMediaType(file: File): string {
    const mediaType = file.type.trim();

    return mediaType.length > 0 ? mediaType : DEFAULT_FILE_MEDIA_TYPE;
}

export function createFileAttachment(file: File): FileAttachment {
    return {
        file,
        filename: file.name,
        mediaType: resolveFileMediaType(file),
        type: "file",
        url: URL.createObjectURL(file),
    };
}

export function revokeFileAttachmentObjectUrl(url: string): void {
    URL.revokeObjectURL(url);
}

export function saveFile(
    blob: Blob | Promise<Blob>,
    options: {
        /** supply without the extension */
        name: string;
        /** file extension */
        extension: string; // TODO: specify specific extensions
        description: string;
        /** existing FileSystemHandle */
        fileHandle?: FileSystemFileHandle | null;
        onError?: (error: unknown) => void;
    }
) {
    try {
        return _fileSave(
            blob,
            {
                description: options.description,
                extensions: [`.${options.extension}`],
                fileName: `${options.name}.${options.extension}`,
            },
            options.fileHandle ?? null
        );
    } catch (error) {
        options.onError?.(error);
        return null;
    }
}

// export { supported as nativeFileSystemSupported } from "browser-fs-access";
export type { FileSystemHandle } from "browser-fs-access";
