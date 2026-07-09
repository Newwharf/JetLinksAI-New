/**
 * 验证当前 ZCode 会话实际调用的模型。
 *
 * 原理：大模型的“自报家门”不可信（系统提示可注入任意字符串）。
 * 真正可靠的验证，是独立调用一次模型 API，看服务端在响应里返回的 model 字段。
 *
 * 本脚本：
 *   1. 读取 ZCode 配置 (~/.zcode/v2/config.json)，找出当前会话用的 provider
 *   2. 取它的 baseURL / apiKey / model id
 *   3. 直接发一个最小的 Anthropic Messages 请求
 *   4. 打印响应里的 model 字段 —— 这是服务端真实下发的，不是模型自己说的
 *
 * 用法：node scripts/verify-model.mjs [providerId]
 *   不传 providerId 时，默认用当前会话的 provider（公司账号）。
 *
 * 安全：API Key 只从配置文件读取到内存，不会打印到终端/日志。
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_PATH = path.join(os.homedir(), '.zcode/v2/config.json');

// 当前会话的 provider（与环境注入的 model name 前缀一致）
const SESSION_PROVIDER_ID = '24579a9b-e17d-480d-acad-c64afe69fd14';

function mask(key) {
  if (!key) return '(empty)';
  if (key.length <= 12) return key.slice(0, 4) + '****';
  return key.slice(0, 6) + '…' + key.slice(-4);
}

function loadProvider(providerId) {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const cfg = JSON.parse(raw);
  const providers = cfg.provider ?? {};
  const id = providerId ?? SESSION_PROVIDER_ID;
  const p = providers[id];
  if (!p) {
    throw new Error(`找不到 provider: ${id}\n可用的有: ${Object.keys(providers).join(', ')}`);
  }
  return { id, ...p };
}

async function callModel({ baseURL, apiKey, model }) {
  const url = baseURL.replace(/\/$/, '') + '/v1/messages';
  const body = {
    model,
    max_tokens: 16,
    messages: [{ role: 'user', content: '只回复两个字：在的' }],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { ok: res.ok, status: res.status, json, raw: text };
}

const providerId = process.argv[2];
const p = loadProvider(providerId);
const modelId = Object.keys(p.models ?? {})[0];

console.log('━━━ 配置读取 ━━━');
console.log('  provider id :', p.id);
console.log('  provider 名 :', p.name);
console.log('  baseURL     :', p.options?.baseURL);
console.log('  apiKey      :', mask(p.options?.apiKey));
console.log('  配置模型 id :', modelId);
console.log('');

console.log('━━━ 独立调用 API ━━━');
console.log('  正在请求', p.options?.baseURL + '/v1/messages', '...\n');

const t0 = Date.now();
const r = await callModel({
  baseURL: p.options.baseURL,
  apiKey: p.options.apiKey,
  model: modelId,
});
const dt = Date.now() - t0;

if (!r.ok) {
  console.error(`  ❌ 请求失败 HTTP ${r.status}`);
  console.error('  响应：', r.raw.slice(0, 500));
  process.exit(1);
}

const returnedModel = r.json?.model;
const content = r.json?.content?.[0]?.text;

console.log('  HTTP 状态   :', r.status, `(${dt}ms)`);
console.log('  返回 model  :', returnedModel);
console.log('  模型回复    :', content);
console.log('  usage       :', JSON.stringify(r.json?.usage));
console.log('');

console.log('━━━ 结论 ━━━');
const expected = modelId;
const match = returnedModel && returnedModel.toLowerCase().includes(expected.toLowerCase());
console.log(match
  ? `  ✅ 服务端确认模型为「${returnedModel}」，与配置「${expected}」一致。`
  : `  ⚠️ 配置是「${expected}」，但服务端返回「${returnedModel}」，不一致！`);
console.log('');
console.log('  说明：上面的 model 字段是智谱服务端在 HTTP 响应里下发的，');
console.log('       不是模型生成的文本——这才是模型身份的客观证据。');
