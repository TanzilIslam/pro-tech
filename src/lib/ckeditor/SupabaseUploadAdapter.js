import { useFileManagerStore } from '@/stores/fileManager'
import { CKEDITOR_STORAGE_BUCKET } from '@/lib/dbTable'

class SupabaseUploadAdapter {
  constructor(loader) {
    this.loader = loader
  }

  upload() {
    const fileManager = useFileManagerStore()
    return this.loader.file.then((file) =>
      fileManager.uploadFile(file, CKEDITOR_STORAGE_BUCKET).then((publicUrl) => {
        if (publicUrl) {
          return { default: publicUrl }
        }
        throw new Error(fileManager.error || 'Upload failed')
      }),
    )
  }

  abort() {
    console.log('Upload aborted.')
  }
}

export default function SupabaseUploadAdapterPlugin(editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
    return new SupabaseUploadAdapter(loader)
  }
}
