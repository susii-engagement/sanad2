
import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = Number(process.env.PORT) || 3022;

app.use(express.json({ limit: '100kb' }));

app.post('/api/tts', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const { text, lang } = req.body ?? {};

  if (!apiKey || !voiceId) {
    return res.status(500).json({
      error: 'راجع إعدادات ElevenLabs في ملف .env.local',
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
      const details = await response.text();
      console.error('ElevenLabs error:', response.status, details);

      return res.status(502).json({
        error:
          response.status === 401 || response.status === 403
            ? 'تحقق من مفتاح ElevenLabs وصلاحياته.'
            : response.status === 429
              ? 'تم تجاوز حد الاستخدام. حاول لاحقًا.'
              : 'تعذر إنشاء الصوت من ElevenLabs.',
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(audio);
  } catch (error) {
    console.error('Local TTS error:', error);

    return res.status(500).json({
      error: 'تعذر الاتصال بخدمة الصوت. تحقق من الإنترنت.',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Local TTS server running at http://127.0.0.1:${PORT}`);
});
