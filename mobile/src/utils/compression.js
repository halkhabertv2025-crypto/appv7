export async function decompressBackupFile(file) {
  try {
    // Check if file is gzip either by extension or type
    if (file.name.endsWith('.gz') || file.type === 'application/gzip' || file.type === 'application/x-gzip') {
      // Use standard DecompressionStream API
      if ('DecompressionStream' in window) {
        const ds = new DecompressionStream('gzip');
        const stream = file.stream().pipeThrough(ds);
        const response = new Response(stream);
        const text = await response.text();
        return JSON.parse(text);
      } else {
        throw new Error('Tarayıcınız sıkıştırılmış dosyaları desteklemiyor. Lütfen modern bir tarayıcı kullanın.');
      }
    } else {
      // Regular JSON file
      const text = await file.text();
      return JSON.parse(text);
    }
  } catch (error) {
    console.error('Decompression error:', error);
    throw new Error('Yedek dosyası okunamadı veya bozuk: ' + error.message);
  }
}
