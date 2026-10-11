import {
  FilePdf,
  FileSpreadsheet,
  FileText,
  FileImage,
  FileAudio,
  FileArchive,
  FilePresentation,
  File,
} from './Icons'

const MAP = {
  PDF: FilePdf,
  Spreadsheet: FileSpreadsheet,
  Document: FileText,
  Text: FileText,
  Image: FileImage,
  Audio: FileAudio,
  Archive: FileArchive,
  Presentation: FilePresentation,
}

const FileTypeIcon = ({ type, size = 18, className = 'file-type-icon' }) => {
  const IconComponent = MAP[type] || File
  return <IconComponent size={size} className={className} />
}

export default FileTypeIcon
