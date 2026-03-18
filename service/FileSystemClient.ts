
export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(options?: any): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

class FileSystemClient {
  private rootHandle: FileSystemDirectoryHandle | null = null;

  get supported() {
    return 'showOpenFilePicker' in window;
  }

  async openFile(options?: any): Promise<FileSystemFileHandle[]> {
    if (!this.supported) throw new Error("File System Access API not supported");
    // @ts-ignore
    return await window.showOpenFilePicker(options);
  }

  async createFile(options?: any): Promise<FileSystemFileHandle> {
    if (!this.supported) throw new Error("File System Access API not supported");
    // @ts-ignore
    return await window.showSaveFilePicker(options);
  }

  async openDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!('showDirectoryPicker' in window)) throw new Error("Directory Picker not supported");
    // @ts-ignore
    const handle = await window.showDirectoryPicker();
    this.rootHandle = handle;
    return handle;
  }

  getRootHandle() {
    return this.rootHandle;
  }

  async getDirectoryEntries(dir?: FileSystemDirectoryHandle) {
    const target = dir ?? this.rootHandle;
    if (!target) throw new Error("No directory selected");

    const result: { name: string; handle: FileSystemHandle; kind: 'file' | 'directory' }[] = [];

    // @ts-ignore
    for await (const [name, handle] of target.entries()) {
      result.push({
        name,
        handle: handle as FileSystemHandle,
        kind: handle.kind as 'file' | 'directory'
      });
    }

    // Sort: Directories first, then files; alphabetical
    result.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === "directory" ? -1 : 1;
    });

    return result;
  }

  async getRootEntries() {
    return this.getDirectoryEntries();
  }
}

const fileSystemClient = new FileSystemClient();
export default fileSystemClient;
