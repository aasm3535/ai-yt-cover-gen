import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const API_KEY = process.argv[2];
const IMAGE_PATH = process.argv[3]; // Опционально: путь к локальной картинке для тестов

if (!API_KEY) {
  console.error(
    "❌ Использование: node test-api.js <ТВОЙ_API_KEY> [ПУТЬ_К_КАРТИНКЕ]",
  );
  console.error("Пример: node test-api.js sk-1234567890abcdef");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
  try {
    console.log("=== Начало тестового запроса к GeminiGen API ===");

    const url = "https://api.geminigen.ai/uapi/v1/generate_image";
    const headers = {
      "x-api-key": API_KEY,
    };

    const formData = new FormData();
    formData.append(
      "prompt",
      "A futuristic cyberpunk city with flying cars, highly detailed, 4k",
    );
    formData.append("model", "nano-banana-pro");
    formData.append("aspect_ratio", "16:9");
    formData.append("style", "Creative");
    formData.append("output_format", "jpeg");
    formData.append("resolution", "1K");

    if (IMAGE_PATH && fs.existsSync(IMAGE_PATH)) {
      console.log(`🖼️ Прикрепляем файл: ${IMAGE_PATH}`);
      formData.append("files", fs.createReadStream(IMAGE_PATH));
    } else {
      console.log("📄 Файл не прикреплен, генерируем просто по тексту.");
    }

    console.log("🚀 Отправляем POST запрос...");
    // При использовании form-data в Node.js обязательно нужно передать getHeaders()
    const response = await axios.post(url, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
    });

    let data = response.data;
    console.log("\n--- Ответ от POST запроса ---");
    console.log(JSON.stringify(data, null, 2));

    if (data.status === 3) {
      console.error("\n❌ Ошибка от сервера:", data.error_message);
      return;
    }

    // Если статус 0 или 1 (в очереди или в процессе), начинаем опрос (polling)
    if ((data.status === 0 || data.status === 1) && data.uuid) {
      console.log("\n⏳ Начинаем поллинг (опрос статуса каждые 3 секунды)...");
      const historyUrl = `https://api.geminigen.ai/uapi/v1/history/${data.uuid}`;

      let attempts = 0;
      while (data.status !== 2 && data.status !== 3 && attempts < 40) {
        // Ждем максимум 2 минуты (40 * 3 сек)
        await sleep(3000);
        attempts++;

        try {
          const historyResponse = await axios.get(historyUrl, { headers });
          data = historyResponse.data;

          console.log(
            `\nПопытка ${attempts} | Статус: ${data.status} | Прогресс: ${data.status_percentage}%`,
          );

          // Выводим весь объект, только если статус 2, чтобы не спамить в консоль,
          // НО для отладки мы выведем его целиком на последнем шаге
          if (data.status === 2 || data.status === 3) {
            console.log("\n🔍 ФИНАЛЬНЫЕ ДАННЫЕ ОТ API:");
            console.log(JSON.stringify(data, null, 2));
          }
        } catch (err) {
          console.log("⚠️ Ошибка поллинга (возможно Rate Limit):", err.message);
        }
      }

      if (data.status === 2) {
        console.log("\n✅ Генерация завершена успешно!");
        console.log("=========================================");
        console.log("ВНИМАТЕЛЬНО ИЗУЧИ JSON ВЫШЕ ☝️");
        console.log("Нужно понять, в каком поле лежит ссылка на картинку.");
        console.log(
          "Возможно это не generate_result, а url, image_url, result_url и т.д.",
        );
        console.log("=========================================");
      } else if (data.status === 3) {
        console.log("\n❌ Ошибка генерации (status 3).");
      } else {
        console.log("\n❌ Не удалось дождаться завершения по таймауту.");
      }
    } else if (data.status === 2) {
      console.log("\n✅ Картинка сразу готова!");
      console.log("Данные:");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("\n❌ Ошибка при выполнении скрипта:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTest();
