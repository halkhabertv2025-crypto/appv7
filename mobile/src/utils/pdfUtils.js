// PDF Utility for Zimmet Documents
// Uses local Roboto fonts for proper Turkish character support

let logoBase64 = null
let fontCache = {}

// Load logo image and convert to base64
export const loadLogo = async () => {
  if (logoBase64) return logoBase64
  
  try {
    const response = await fetch('/logo.png')
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        logoBase64 = reader.result
        resolve(logoBase64)
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Logo yüklenemedi:', error)
    return null
  }
}

// Convert blob to base64 safely
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Load and embed Roboto font from local files
export const loadRobotoFont = async (doc) => {
  try {
    // Load Roboto Regular
    if (!fontCache.regular) {
      console.log('Loading Roboto-Regular...')
      const response = await fetch('/fonts/Roboto-Regular.ttf')
      if (!response.ok) throw new Error('Regular font not found')
      const blob = await response.blob()
      fontCache.regular = await blobToBase64(blob)
    }
    doc.addFileToVFS('Roboto-Regular.ttf', fontCache.regular)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    
    // Load Roboto Bold
    if (!fontCache.bold) {
      console.log('Loading Roboto-Bold...')
      const response = await fetch('/fonts/Roboto-Bold.ttf')
      if (!response.ok) throw new Error('Bold font not found')
      const blob = await response.blob()
      fontCache.bold = await blobToBase64(blob)
    }
    doc.addFileToVFS('Roboto-Bold.ttf', fontCache.bold)
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
    
    return true
  } catch (error) {
    console.error('Font yüklenemedi, sistem fontuna dönülüyor:', error)
    return false
  }
}

// Legal text paragraphs (Original Turkish)
export const LEGAL_TEXT_1 = 'Aşağıda dökümü yapılan Kişisel Koruyucu malzemeleri teslim aldım ve nasıl kullanacağı konusunda eğitim aldım. Tarafıma verilen bu malzemeleri bu işyerinde kullanmayı ve kullanım süresi doluncaya kadar muhafaza etmeyi, kaybolduğunda veya kötü kullanım nedeniyle hasarlandığında fatura bedelinin ücretimden kesileceğini ve derhal yenisini almak üzere yetkiliye başvuracağımı taahhüt ederim.'

export const LEGAL_TEXT_2 = 'Ayrıca bu malzemeleri kullanmadığım takdirde birinci uyarıda bir günlük yevmiyemin kesileceğini, ikinci uyarıda ise 6331 Sayılı İş Kanunun ilgili maddesi uyarınca görevime son verileceğini kabul ederim.'

// Add signature section
export const addSignatureSection = (doc, finalY, calisanName, calisanDepartman) => {
  const cleanName = calisanName || ''
  const cleanDept = calisanDepartman || ''
  
  // Font check - if Roboto loaded, use it
  const fontName = doc.getFontList().Roboto ? 'Roboto' : 'helvetica'
  
  // Date
  doc.setFontSize(10)
  doc.setFont(fontName, 'normal')
  const today = new Date()
  doc.text(`TARİH: ${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`, 20, finalY)
  
  finalY += 15
  
  // Left side - Teslim Eden
  doc.setFont(fontName, 'bold')
  doc.text('TESLİM EDEN', 50, finalY, { align: 'center' })
  
  doc.setFont(fontName, 'normal')
  doc.text('ADI SOYADI:', 20, finalY + 12)
  doc.line(50, finalY + 12, 90, finalY + 12)
  
  doc.text('ÇALIŞTIĞI BÖLÜM:', 20, finalY + 22)
  doc.line(62, finalY + 22, 90, finalY + 22)
  
  doc.text('İMZASI:', 20, finalY + 32)
  doc.line(45, finalY + 32, 90, finalY + 32)
  
  // Right side - Teslim Alan
  doc.setFont(fontName, 'bold')
  doc.text('TESLİM ALAN', 155, finalY, { align: 'center' })
  
  doc.setFont(fontName, 'normal')
  doc.text('ADI SOYADI:', 115, finalY + 12)
  doc.text(cleanName, 148, finalY + 12)
  doc.line(145, finalY + 12, 190, finalY + 12)
  
  doc.text('ÇALIŞTIĞI BÖLÜM:', 115, finalY + 22)
  doc.text(cleanDept, 158, finalY + 22)
  doc.line(155, finalY + 22, 190, finalY + 22)
  
  doc.text('İMZASI:', 115, finalY + 32)
  doc.line(140, finalY + 32, 190, finalY + 32)
}

// Create table with borders on data rows (header borderless with gray background)
export const createZimmetTable = (doc, tableData, startY) => {
  const colWidths = [15, 40, 30, 40, 15, 35]
  const headers = ['NO', 'ENVANTER TİPİ', 'MARKA', 'MODEL', 'ADEDİ', 'SERİ NUMARASI']
  const totalWidth = colWidths.reduce((a, b) => a + b, 0)
  const grayColor = [220, 220, 220]
  
  const fontName = doc.getFontList().Roboto ? 'Roboto' : 'helvetica'
  
  // Draw header background (no border, just fill)
  doc.setFillColor(...grayColor)
  doc.rect(20, startY, totalWidth, 8, 'F')
  
  // Header text
  doc.setFontSize(9)
  doc.setFont(fontName, 'bold')
  let xPos = 20
  headers.forEach((header, i) => {
    doc.text(header, xPos + colWidths[i] / 2, startY + 5.5, { align: 'center' })
    xPos += colWidths[i]
  })
  
  // Data rows with borders
  doc.setFont(fontName, 'normal')
  doc.setDrawColor(...grayColor)
  doc.setLineWidth(0.2)
  
  let rowY = startY + 8
  tableData.forEach((row) => {
    xPos = 20
    row.forEach((data, i) => {
      doc.rect(xPos, rowY, colWidths[i], 8)
      doc.text(String(data || '-'), xPos + colWidths[i] / 2, rowY + 5.5, { align: 'center' })
      xPos += colWidths[i]
    })
    rowY += 8
  })
  
  return rowY 
}
