export function GetFilename(path: string): string {
    path = path.replace('\\', '/');
    return path.split('/').pop() || path;
}

export function GetFilenameWithoutExe(path: string): string {
    const filename = GetFilename(path);
    const items = filename.split('.');
    const len = items.length;
    if (len <= 1) {
        return filename;
    } else {
        return items.slice(0, len-1).join('.');
    }
}