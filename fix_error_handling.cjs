const fs = require('fs');
let file = fs.readFileSync('src/services/wiro/thumbnail.ts', 'utf-8');

file = file.replace(
  /if \(task.status === "task_postprocess_end"\) \{/,
  `if (task.status === "task_postprocess_end") {
        console.log("Финальные данные задачи:", task);
        
        // Handle specific API failure in debug output
        if (task.debugoutput && task.debugoutput.includes("Task failed")) {
             throw new Error("Модель отклонила генерацию. Возможно, сработал фильтр безопасности (попробуйте изменить фото или промпт).");
        }`
);

file = file.replace(
  /throw new Error\(\s*"Задача завершена, но ссылка не найдена\. Ответ: " \+\s*JSON\.stringify\(task\),\s*\);/g,
  `throw new Error("Задача завершена, но ссылка не найдена. Скорее всего, сработал фильтр безопасности API.");`
);

fs.writeFileSync('src/services/wiro/thumbnail.ts', file);
