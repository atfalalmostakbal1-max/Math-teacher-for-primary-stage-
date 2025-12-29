
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MathSolution } from "../types";

const API_KEY = process.env.API_KEY || "";

export const transcribeAudio = async (audioBase64: string, language: 'ar' | 'en' = 'ar'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const prompt = language === 'ar' 
    ? "حول هذا التسجيل الصوتي لمسألة رياضيات إلى نص مكتوب بدقة. اكتب النص فقط بدون أي مقدمات."
    : "Transcribe this audio of a math problem into clear text. Provide only the text transcription.";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/webm;codecs=opus",
            data: audioBase64,
          },
        },
        { text: prompt },
      ],
    },
  });

  return response.text || "";
};

export const solveMathProblem = async (
  input: string | { data: string; mimeType: string },
  isImage: boolean = false,
  language: 'ar' | 'en' = 'ar'
): Promise<MathSolution> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemInstruction = language === 'ar' 
    ? `أنتِ معلمة رياضيات مصرية خبيرة للمرحلة الابتدائية (من الصف الأول للسادس).
  مهمتك: حل المسألة الرياضية المرفقة بدقة كاملة وبأسلوب الكتاب المدرسي المصري باللغة العربية.
  
  قواعد هامة جداً للتعامل مع الصور (Multi-problem Analysis):
  1. إذا كانت الصورة تحتوي على صفحة بها عدة مسائل:
     - ابحثي أولاً عن أي "تمييز بصري" (مثل: دائرة حول مسألة، خط تحت مسألة، تظليل بلون فسفوري، أو تهشير).
     - إذا وجدتِ تمييزاً، حلي المسائل المحددة فقط وتجاهلي الباقي.
     - إذا لم يوجد أي تمييز، حلي جميع المسائل الموجودة في الصفحة بالتتابع من الأعلى إلى الأسفل.
  2. في مسائل الوقت (الساعات والدقائق): التزمي دائماً بوضع خانة "الساعات" على اليمين وخانة "الدقائق" على اليسار (ساعة : دقيقة) لأن الكتابة بالعربية من اليمين للياسر.
  3. في السبورة الذكية، عند كتابة عمليات الجمع أو الطرح الزمني، نظميها في أعمدة بحيث تكون الساعات في العمود الأيمن والدقائق في العمود الأيسر.
  
  الهيكل المطلوب (JSON):
     - understanding: فهم المسألة (وضحي هنا إذا كنتِ تحلين مسائل محددة من الصورة أو الصفحة كاملة).
     - textSteps: خطوات الحل المفصلة لكل المسائل المطلوبة بالترتيب.
     - audioScript: نص الشرح الصوتي العام للحل النصي بلهجة مصرية محببة.
     - whiteboardSteps: قائمة بالخطوات التي ستظهر على السبورة. استخدمي الألوان: white (للكتابة العادية)، yellow (للخطوات الهامة)، green (للنتيجة).
     - whiteboardAudioScript: نص شرح المعلمة وهي تكتب على السبورة خطوة بخطوة.
     - drawingPrompt: وصف دقيق لصورة تعليمية بسيطة توضح هذه المسألة الرياضية. يجب أن يكون الوصف بالإنجليزية.
     - drawingAudioScript: نص شرح المعلمة للرسم التوضيحي.
     - finalResult: الإجابة النهائية (أو الإجابات النهائية مرتبة) مع تشجيع حماسي.`
    : `You are an expert Math teacher for primary school (grades 1 to 6).
  Your task: Solve the attached math problem accurately following the standard curriculum approach in English.
  
  Important rules for Images (Multi-problem Analysis):
  1. If the image contains multiple problems:
     - First, look for visual highlights (circles, boxes, highlighters, underlines, or hatching).
     - If highlights are found, solve ONLY the marked problem(s).
     - If no highlights are present, solve all problems on the page sequentially from top to bottom.
  2. For time problems (hours and minutes): Hours should be on the left and minutes on the right (HH:MM).
  
  Required Structure (JSON):
     - understanding: Understanding of the problem (specify if solving specific highlighted parts or the whole page).
     - textSteps: Detailed solution steps in English.
     - audioScript: Audio explanation script.
     - whiteboardSteps: Steps for the smartboard.
     - whiteboardAudioScript: Teacher's voice script for the board.
     - drawingPrompt: Detailed description for a drawing in English.
     - drawingAudioScript: Teacher's script explaining the drawing.
     - finalResult: Final answer(s) and encouragement.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      understanding: {
        type: Type.OBJECT,
        properties: {
          rephrased: { type: Type.STRING },
          given: { type: Type.ARRAY, items: { type: Type.STRING } },
          required: { type: Type.STRING },
        },
        required: ["rephrased", "given", "required"],
      },
      textSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
      audioScript: { type: Type.STRING },
      whiteboardSteps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            color: { type: Type.STRING, enum: ["white", "yellow", "green"] },
          },
          required: ["text", "color"],
        },
      },
      whiteboardAudioScript: { type: Type.STRING },
      drawingPrompt: { type: Type.STRING },
      drawingAudioScript: { type: Type.STRING },
      finalResult: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          encouragement: { type: Type.STRING },
        },
        required: ["answer", "encouragement"],
      },
    },
    required: ["understanding", "textSteps", "audioScript", "whiteboardSteps", "whiteboardAudioScript", "drawingPrompt", "drawingAudioScript", "finalResult"],
  };

  const contents = isImage && typeof input !== 'string' 
    ? { parts: [{ inlineData: input }, { text: language === 'ar' ? "حلِي هذه المسائل بدقة. إذا وجدتِ تحديداً (دائرة أو تظليل) حلي المحدد فقط، وإلا حلي الصفحة كاملة بالتتابع." : "Solve these problems. If marked, solve only the highlighted ones; otherwise, solve the whole page sequentially." }] }
    : { parts: [{ text: language === 'ar' ? `حلِي هذه المسألة: ${input}.` : `Solve this problem: ${input}.` }] };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  try {
    return JSON.parse(response.text || "{}") as MathSolution;
  } catch (e) {
    console.error("JSON Parse error", e);
    throw new Error(language === 'ar' ? "عذراً يا بطلة، واجهت مشكلة في كتابة الحل." : "Sorry, I had trouble writing the solution.");
  }
};

export const generateMathIllustration = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Create a simple, educational math drawing for kids: ${prompt}. 
          RULES: 
          1. ALL TEXT, NUMBERS, AND LABELS MUST BE IN ENGLISH ONLY. 
          2. STRICTLY NO ARABIC TEXT OR CHARACTERS. 
          3. Use a clean white background, vibrant colors, and 2D flat child-friendly style.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
};

export const generateAudio = async (text: string, language: 'ar' | 'en' = 'ar'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const prompt = language === 'ar' 
    ? `بصوت معلمة مصرية حنونة ومبهجة، اقرئي النص التالي للأطفال: ${text}`
    : `As a friendly and cheerful teacher, read the following text for children: ${text}`;
    
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: language === 'ar' ? 'Kore' : 'Puck' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
};

export const decodeAudio = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export async function createAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
