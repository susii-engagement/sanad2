
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const { text, lang } = req.body ?? {};

  if (!apiKey || !voiceId) {
    return res.status(500).json({
      error: 'إعدادات الصوت غير مكتملة على الخادم.',
    });
  }

  if (
    typeof text !== 'string' ||
    !text.trim() ||
    text.length > 5000 ||
    !['ar', 'en'].includes(lang)
  ) {
    return res.status(400).json({
      error: 'النص أو اللغة غير صالحين.',
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_multilingual_v2',
        }),
      },
    );

    if (!response.ok) {
      console.error('ElevenLabs status:', response.status);

      return res.status(502).json({
        error:
          response.status === 429
            ? 'تم تجاوز حد الاستخدام. حاول لاحقًا.'
            : 'تعذر إنشاء الصوت.',
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(audio);
  } catch (error) {
    console.error('TTS request failed:', error);

    return res.status(502).json({
      error: 'تعذر الاتصال بخدمة الصوت.',
    });
  }
}
