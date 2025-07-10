export async function parseSessionFile(file: File): Promise<[number, any] | null> {
  const text = await (typeof (file as any).text === 'function'
    ? (file as any).text()
    : new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      }));
  const obj = JSON.parse(text);
  const id: number | undefined = obj.session?.pk ?? obj.pk;
  if (id === undefined) return null;
  return [id, obj.session || obj];
}
