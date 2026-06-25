/**
 * WebGME-backed virtual file system for Langium (design doc §9.1).
 * The control posts file snapshots; the worker resolves imports from that snapshot.
 */

export interface VirtualFileEntry {
    uri: string;
    content: string;
}

export class WebGMEFileSystemProvider {
    private readonly files = new Map<string, string>();

    constructor(initialFiles: VirtualFileEntry[] = []) {
        initialFiles.forEach((file) => this.files.set(file.uri, file.content));
    }

    updateFiles(files: VirtualFileEntry[]): void {
        this.files.clear();
        files.forEach((file) => this.files.set(file.uri, file.content));
    }

    readFile(uri: string): string | undefined {
        return this.files.get(uri);
    }

    readDirectory(): string[] {
        return Array.from(this.files.keys());
    }
}
