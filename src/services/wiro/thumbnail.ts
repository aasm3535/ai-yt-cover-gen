import { WiroClient } from "./client";
import { WiroModel, Resolution, AspectRatio } from "./types";
import { ThumbnailStyle } from "../../types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GenerateWiroThumbnailOptions {
  imageFile: File;
  topic: string;
  style: ThumbnailStyle;
  model: WiroModel;
  resolution?: Resolution;
  aspectRatio?: AspectRatio;
  onProgress?: (progress: number) => void;
  additionalPrompt?: string;
}

export const generateWiroThumbnail = async ({
  imageFile,
  topic,
  style,
  model,
  resolution = "1K",
  aspectRatio = "16:9",
  onProgress,
  additionalPrompt,
}: GenerateWiroThumbnailOptions): Promise<string | null> => {
  const apiKey =
    (window as any).WIRO_API_KEY || import.meta.env.VITE_WIRO_API_KEY;
  const apiSecret =
    (window as any).WIRO_API_SECRET || import.meta.env.VITE_WIRO_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Wiro API Key or API Secret is missing. Please check your environment variables.",
    );
  }

  const client = new WiroClient({ apiKey, apiSecret });

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

  console.log(`=== Запуск генерации превью через Wiro (${model}) ===`);

  try {
    // 1. Start Task
    onProgress?.(10);
    const runResponse = await client.runTask(model, {
      inputImage: imageFile,
      prompt,
      aspectRatio,
      resolution,
      safetySetting: "OFF",
    });

    if (!runResponse.result || !runResponse.taskid) {
      throw new Error(
        runResponse.errors?.join(", ") ||
          "Не удалось запустить задачу генерации",
      );
    }

    const taskId = runResponse.taskid;
    console.log(`⏳ Задача ${taskId} запущена, начинаем опрос статуса...`);

    // 2. Poll for Completion
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes with 2s interval

    while (attempts < maxAttempts) {
      await sleep(2000);
      attempts++;

      const detailResponse = await client.getTaskDetail(taskId);

      if (
        !detailResponse.result ||
        !detailResponse.tasklist ||
        detailResponse.tasklist.length === 0
      ) {
        throw new Error(
          detailResponse.errors?.join(", ") ||
            "Не удалось получить статус задачи",
        );
      }

      const task = detailResponse.tasklist[0];
      console.log(`Попытка ${attempts}, статус: ${task.status}`);

      // Map task status to rough progress for UI feedback
      switch (task.status) {
        case "task_queue":
          onProgress?.(20);
          break;
        case "task_accept":
          onProgress?.(30);
          break;
        case "task_assign":
          onProgress?.(40);
          break;
        case "task_preprocess_start":
          onProgress?.(50);
          break;
        case "task_preprocess_end":
          onProgress?.(60);
          break;
        case "task_start":
          onProgress?.(70);
          break;
        case "task_output":
          onProgress?.(90);
          break;
        case "task_postprocess_end":
          onProgress?.(100);
          break;
        case "task_cancel":
          throw new Error("Задача была отменена");
      }

      if (task.status === "task_postprocess_end") {
        console.log("Финальные данные задачи:", task);
        let outputs = task.outputs;
        if (typeof outputs === "string") {
          try {
            outputs = JSON.parse(outputs);
          } catch (e) {}
        }

        const output = Array.isArray(outputs) ? outputs[0] : null;
        const imageUrl =
          output?.url || (task as any).image_url || (task as any).result_url;

        if (imageUrl) {
          console.log("✅ Успешно! Ссылка на изображение:", imageUrl);
          return imageUrl;
        } else {
          throw new Error(
            "Задача завершена, но ссылка не найдена. Ответ: " +
              JSON.stringify(task),
          );
        }
      }
    }

    throw new Error("Превышено время ожидания генерации изображения");
  } catch (error: any) {
    console.error("❌ Ошибка при запросе к Wiro API:", error);
    throw error;
  }
};
