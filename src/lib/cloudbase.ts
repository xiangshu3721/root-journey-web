import cloudbase from '@cloudbase/js-sdk';

const env = import.meta.env.VITE_CLOUDBASE_ENV_ID as string | undefined;
const accessKey = import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY as string | undefined;
const functionUrl = import.meta.env.VITE_CLOUDBASE_FUNCTION_URL as string | undefined;

// 浏览器只使用 Publishable Key；短信、模型与存储签名的秘密始终留在 CloudBase。
export const cloudbaseApp = env ? cloudbase.init({ env, region: 'ap-shanghai', accessKey }) : null;
export const cloudbaseAuth = cloudbaseApp ? cloudbaseApp.auth({ persistence: 'local' }) : null;
export const cloudbaseConfigured = Boolean(cloudbaseApp && functionUrl);

export async function uploadPrivateEvidence(file: File, accessToken: string) {
  if (!functionUrl) throw new Error('尚未配置 CloudBase 云函数');
  const signed = await fetch(`${functionUrl}/storage/signed-upload`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ name: file.name, type: file.type }) });
  if (!signed.ok) throw new Error('无法创建私有上传地址');
  const { url, path } = await signed.json() as { url: string; path: string };
  const upload = await fetch(url, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
  if (!upload.ok) throw new Error('文件上传失败');
  return path;
}
