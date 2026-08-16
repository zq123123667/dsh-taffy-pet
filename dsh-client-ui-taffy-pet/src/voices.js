// 音色常量 —— 单一来源（source of truth）
// host.js / client.js 里各自内嵌一份副本（动态模式要求自包含单文件，无法 import）；
// scripts/build.mjs 会校验两份副本与本文件一致，防止漂移。修改音色请只改这里，
// 然后运行 `node scripts/build.mjs`（校验不通过会报错并提示同步）。
export const DEFAULT_VOICE = "zh_female_sajiaoxuemei_uranus_bigtts";

export const VOICES = {
  "zh_female_sajiaoxuemei_uranus_bigtts": "撒娇学妹",
  "zh_female_tianmeixiaoyuan_uranus_bigtts": "甜美小源",
  "zh_female_tianmeitaozi_uranus_bigtts": "甜美桃子",
  "zh_female_linjianvhai_uranus_bigtts": "邻家女孩",
  "saturn_zh_female_keainvsheng_tob": "可爱女生",
  "saturn_zh_female_tiaopigongzhu_tob": "调皮公主",
  "zh_female_vv_uranus_bigtts": "Vivi",
  "zh_female_xiaohe_uranus_bigtts": "小何",
  "zh_female_shuangkuaisisi_uranus_bigtts": "爽快思思",
  "zh_female_kefunvsheng_uranus_bigtts": "暖阳女声",
  "zh_female_qingxinnvsheng_uranus_bigtts": "清新女声",
  "zh_male_shaonianzixin_uranus_bigtts": "少年梓辛",
  "zh_male_taocheng_uranus_bigtts": "小天",
  "zh_male_m191_uranus_bigtts": "云舟",
};

/** 客户端下拉用：与 VOICES 同序的 {id, name} 数组。 */
export const FALLBACK_VOICES = Object.entries(VOICES).map(([id, name]) => ({ id, name }));

export const SSE_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse";
export const PLAN_URL = "https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional";
export const ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/tts";
