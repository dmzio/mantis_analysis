export async function parseSessionFile(file: File): Promise<[number, any] | null> {
  let text: string;
  if (typeof (file as any).text === 'function') {
    text = await (file as any).text();
  } else {
    const impl = Object.getOwnPropertySymbols(file).find(s => s.toString() === 'Symbol(impl)');
    if (impl && (file as any)[impl]?._buffer) {
      text = Buffer.from((file as any)[impl]._buffer).toString();
    } else {
      text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    }
  }
  const obj = JSON.parse(text);
  const id: number | undefined = obj.session?.pk ?? obj.pk;
  if (id === undefined) return null;
  return [id, obj.session || obj];
}
