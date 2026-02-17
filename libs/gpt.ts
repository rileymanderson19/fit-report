import axios from 'axios';

// Supports both OpenRouter (preferred) and direct OpenAI as fallback.
// Set OPENROUTER_API_KEY to use OpenRouter, or OPENAI_API_KEY for direct OpenAI.
export const sendOpenAi = async (
  messages: any[],
  userId: number,
  max = 100,
  temp = 1
) => {
  const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const url = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const apiKey = useOpenRouter
    ? process.env.OPENROUTER_API_KEY
    : process.env.OPENAI_API_KEY;

  console.log(`Ask GPT >>> (via ${useOpenRouter ? 'OpenRouter' : 'OpenAI'})`);
  messages.map((m) =>
    console.log(' - ' + m.role.toUpperCase() + ': ' + m.content)
  );

  const body = JSON.stringify({
    model: 'gpt-4o',
    messages,
    max_tokens: max,
    temperature: temp,
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (useOpenRouter) {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    headers['X-Title'] = 'FitReport';
  }

  try {
    const res = await axios.post(url, body, { headers });

    const answer = res.data.choices[0].message.content;
    const usage = res?.data?.usage;

    console.log('>>> ' + answer);
    console.log(
      'TOKENS USED: ' +
        usage?.total_tokens +
        ' (prompt: ' +
        usage?.prompt_tokens +
        ' / response: ' +
        usage?.completion_tokens +
        ')'
    );
    console.log('\n');

    return answer;
  } catch (e) {
    console.error('GPT Error: ' + e?.response?.status, e?.response?.data);
    return null;
  }
};
