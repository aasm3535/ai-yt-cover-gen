import axios from "axios";
import { ThumbnailStyle } from "../types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateThumbnail = async (
  imageFile: File,
  topic: string,
  style: ThumbnailStyle,
  resolution: string = "1K",
  onProgress?: (progress: number) => void,
  additionalPrompt?: string,
): Promise<string | null> => {
  const apiKey = (window as any).GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "API Key is missing. Please check your environment variables or enter it in the UI.",
    );
  }

  const prompt = `
    Create a high-quality YouTube thumbnail based on the attached image.

    Context/Topic of the video: "${topic}".
    Visual Style Requirements: ${style}.
    ${additionalPrompt ? `\n    ADDITIONAL USER EDITS/INSTRUCTIONS:\n    ${additionalPrompt}\n` : ""}
    Instructions:
    1. Use the person or main subject from the provided image.
    2. Transform the background and lighting to match the requested style.
    3. The image should be eye-catching, high resolution, and suitable for a YouTube cover.
    4. Make it look like a professional YouTuber's thumbnail.
  `.trim();

  // Используем локальный прокси для обхода CORS
  const url = "/uapi/v1/generate_image";

  const headers = {
    "x-api-key": apiKey,
  };

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("model", "nano-banana-pro");
  formData.append("aspect_ratio", "16:9");
  formData.append("style", "Creative");
  formData.append("output_format", "jpeg");
  formData.append("resolution", resolution);
  formData.append("files", imageFile);

  console.log("=== Запуск генерации превью ===");
  console.log("URL:", url);
  console.log("Тема видео:", topic);

  try {
    const response = await axios.post(url, formData, { headers });
    let data = response.data;

    console.log("=== Ответ от API получен ===");
    console.log("Данные:", data);

    if (data.status === 3) {
      throw new Error(
        data.error_message ||
          "Ошибка генерации изображения на стороне сервера.",
      );
    }

    // Если статус 0 или 1 (в процессе/в очереди), начинаем поллинг
    if ((data.status === 0 || data.status === 1) && data.uuid) {
      console.log("⏳ Изображение генерируется, начинаем опрос статуса...");
      if (data.status_percentage !== undefined) {
        onProgress?.(data.status_percentage);
      }
      const historyUrl = `/uapi/v1/history/${data.uuid}`;

      let attempts = 0;
      const maxAttempts = 60; // 60 попыток по 2 секунды = 120 секунд таймаут

      while (data.status !== 2 && data.status !== 3 && attempts < maxAttempts) {
        await sleep(2000); // ждем 2 секунды
        attempts++;

        try {
          const historyResponse = await axios.get(historyUrl, { headers });
          data = historyResponse.data;
          console.log(
            `Попытка ${attempts}, статус:`,
            data.status,
            data.status_percentage + "%",
          );

          if (data.status_percentage !== undefined) {
            onProgress?.(data.status_percentage);
          }

          if (data.status === 3) {
            throw new Error(
              data.error_message || "Ошибка генерации при опросе статуса.",
            );
          }
        } catch (pollError: any) {
          console.warn("Ошибка при опросе статуса, продолжаем...", pollError);
          // Если мы выбросили ошибку (например, статус 3), нужно прервать поллинг
          if (data.status === 3) {
            throw pollError;
          }
        }
      }

      if (data.status !== 2) {
        if (data.status === 3) {
          throw new Error(
            data.error_message || "Генерация завершилась с ошибкой (status 3).",
          );
        }
        throw new Error("Превышено время ожидания генерации изображения.");
      }
    }

    if (data.status === 2 || data.generate_result) {
      const finalUrl =
        data.generate_result ||
        (data.generated_image &&
          data.generated_image.length > 0 &&
          data.generated_image[0].image_url) ||
        (data.generated_image &&
          data.generated_image.length > 0 &&
          data.generated_image[0].file_download_url) ||
        data.thumbnail_url ||
        data.url ||
        data.image_url ||
        data.result_url ||
        data.file_url ||
        (data.images && data.images[0]) ||
        (data.output && data.output[0]);

      console.log("✅ Успешно! Ссылка на изображение:", finalUrl);
      if (!finalUrl) {
        console.log(
          "⚠️ Внимание: Ссылка не найдена. Полные данные ответа:",
          data,
        );
      }
      return finalUrl || null;
    }

    return null;
  } catch (error: any) {
    console.error("❌ Ошибка при запросе к API:", error);

    if (axios.isAxiosError(error)) {
      console.error("Детали ошибки Axios:", error.response?.data);
      throw new Error(
        error.response?.data?.error_message ||
          error.response?.data?.message ||
          `API Error: ${error.response?.status} ${error.message}`,
      );
    }

    throw error;
  }
};
