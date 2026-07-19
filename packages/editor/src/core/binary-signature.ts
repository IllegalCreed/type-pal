/** 浏览器/FSA 写入链共用的二进制内容签名；长度相同也必须按内容判变。 */
export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const source = bytes instanceof Uint8Array ? Uint8Array.from(bytes).buffer : bytes
  const digest = await crypto.subtle.digest('SHA-256', source)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export async function binarySnapshotSignature(bytes: ArrayBuffer): Promise<string> {
  return `bin:${bytes.byteLength}:${await sha256Hex(bytes)}`
}
