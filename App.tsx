import React, { useState, useEffect } from "react";
import Button from "./components/Button";
import UploadZone from "./components/UploadZone";
import { ThumbnailStyle, AppState } from "./types";
import { generateThumbnail } from "./services/geminiService";

const styleTranslations: Record<ThumbnailStyle, string> = {
  [ThumbnailStyle.MINIMALIST]: "Минимализм и чистота",
  [ThumbnailStyle.CLICKBAIT]: "Высокий контраст (Кликбейт)",
  [ThumbnailStyle.GAMING]: "Гейминг и неон",
  [ThumbnailStyle.PROFESSIONAL]: "Профессиональный стиль",
  [ThumbnailStyle.VLOG]: "Лайфстайл и влог",
};

interface Version {
  id: string;
  url: string;
  prompt?: string;
  timestamp: number;
}

interface HistoryItem {
  id: string;
  topic: string;
  style: string;
  styleEnum: ThumbnailStyle;
  file: File;
  versions: Version[];
  activeVersionIndex: number;
}

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [topic, setTopic] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ThumbnailStyle>(
    ThumbnailStyle.CLICKBAIT,
  );
  const [resolution, setResolution] = useState<string>("1K");
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [generatingItemId, setGeneratingItemId] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      const apiKey =
        (window as any).GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey) {
        setHasApiKey(true);
      } else {
        setHasApiKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSaveKey = (key: string) => {
    if (key.trim().length > 0) {
      (window as any).GEMINI_API_KEY = key;
      setHasApiKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile || !topic) {
      setErrorMsg("Пожалуйста, укажите тему и загрузите фото.");
      return;
    }

    setAppState(AppState.GENERATING);
    setGeneratingItemId(null);
    setErrorMsg(null);

    try {
      const url = await generateThumbnail(
        selectedFile,
        topic,
        selectedStyle,
        resolution,
      );
      if (url) {
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            topic,
            style: styleTranslations[selectedStyle],
            styleEnum: selectedStyle,
            file: selectedFile,
            versions: [
              {
                id: Date.now().toString(),
                url,
                timestamp: Date.now(),
              },
            ],
            activeVersionIndex: 0,
          },
          ...prev,
        ]);
        setAppState(AppState.SUCCESS);
      } else {
        throw new Error(
          "ИИ вернул ответ, но изображение не было сгенерировано. Попробуйте другой промпт или изображение.",
        );
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("401")) {
        setHasApiKey(false);
        setErrorMsg(
          "Сессия API ключа истекла или он недействителен. Пожалуйста, выберите ключ заново.",
        );
        setAppState(AppState.IDLE);
        return;
      }
      setAppState(AppState.ERROR);
      setErrorMsg(err.message || "Что-то пошло не так при генерации.");
    }
  };

  const handleEditGenerate = async (item: HistoryItem) => {
    if (!editPrompt.trim()) return;

    setAppState(AppState.GENERATING);
    setGeneratingItemId(item.id);
    setEditingId(null);
    setErrorMsg(null);

    try {
      const url = await generateThumbnail(
        item.file,
        item.topic,
        item.styleEnum,
        resolution,
        undefined,
        editPrompt,
      );
      if (url) {
        setHistory((prev) =>
          prev.map((h) => {
            if (h.id === item.id) {
              return {
                ...h,
                versions: [
                  ...h.versions,
                  {
                    id: Date.now().toString(),
                    url,
                    timestamp: Date.now(),
                    prompt: editPrompt,
                  },
                ],
                activeVersionIndex: h.versions.length,
              };
            }
            return h;
          }),
        );
        setAppState(AppState.SUCCESS);
        setEditPrompt("");
      } else {
        throw new Error(
          "ИИ вернул ответ, но изображение не было сгенерировано.",
        );
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("401")) {
        setHasApiKey(false);
        setErrorMsg("Сессия API ключа истекла или он недействителен.");
        setAppState(AppState.IDLE);
        return;
      }
      setAppState(AppState.ERROR);
      setErrorMsg(err.message || "Что-то пошло не так при редактировании.");
    } finally {
      setGeneratingItemId(null);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `thumbnail-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (hasApiKey === false) {
    return (
      <div className="h-screen w-screen bg-[#1e1e1e] flex flex-col font-sans text-zinc-50 antialiased overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-800 bg-[#252526] p-8 shadow-2xl">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                Авторизация
              </h1>
              <p className="text-sm text-zinc-400">
                Приложение использует модель{" "}
                <strong>Nano Banana Pro (4K)</strong>. Укажите ваш API ключ
                GeminiGen для продолжения.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSaveKey(formData.get("apiKey") as string);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <input
                  name="apiKey"
                  type="password"
                  placeholder="Ваш x-api-key"
                  required
                  className="flex h-10 w-full rounded-md border border-zinc-700 bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
              </div>
              <Button type="submit" className="w-full">
                Войти в рабочую среду
              </Button>
            </form>
            <div className="text-sm text-zinc-500">
              Нет ключа?{" "}
              <a
                href="https://geminigen.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-zinc-300 underline underline-offset-4 hover:text-zinc-50 transition-colors"
              >
                Получить API ключ
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasApiKey === null) {
    return (
      <div className="h-screen w-screen bg-[#1e1e1e] flex items-center justify-center overflow-hidden">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1e1e1e] flex font-sans text-zinc-50 antialiased selection:bg-zinc-700 selection:text-zinc-50">
      {/* Sidebar - Design Panel */}
      <aside className="w-80 lg:w-96 flex-shrink-0 bg-[#252526] border-r border-[#383838] flex flex-col z-20 shadow-xl relative">
        <div className="h-14 flex items-center px-6 border-b border-[#383838] flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-zinc-50"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <polygon points="10 9 15 12 10 15 10 9" />
            </svg>
            <span className="font-semibold tracking-tight text-zinc-50">
              TubeGenie
            </span>
            <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 bg-[#383838] text-zinc-300 rounded-md">
              DESIGN
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Исходные данные
            </h3>

            <div className="space-y-2">
              <label
                htmlFor="topic"
                className="text-xs font-medium text-zinc-300"
              >
                Тема видео
              </label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Например, 24 часа в заброшенном доме"
                className="flex h-9 w-full rounded-md border border-[#383838] bg-[#1e1e1e] px-3 py-1 text-sm text-zinc-50 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 transition-all"
              />
            </div>

            <UploadZone
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Качество
            </h3>
            <div className="flex gap-2">
              {["1K", "2K", "4K"].map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`
                    flex-1 rounded-md border py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400
                    ${
                      resolution === res
                        ? "border-zinc-500 bg-[#383838] text-zinc-50"
                        : "border-[#383838] bg-transparent text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200"
                    }
                  `}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Стилизация
            </h3>
            <div className="space-y-2">
              {Object.values(ThumbnailStyle).map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`
                    flex items-center justify-between w-full rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400
                    ${
                      selectedStyle === style
                        ? "border-zinc-500 bg-[#383838] text-zinc-50"
                        : "border-[#383838] bg-transparent text-zinc-400 hover:bg-[#2d2d2d] hover:text-zinc-200"
                    }
                  `}
                >
                  <span>{styleTranslations[style]}</span>
                  {selectedStyle === style && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-50"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#383838] bg-[#252526] flex-shrink-0">
          <Button
            onClick={handleGenerate}
            disabled={
              !topic || !selectedFile || appState === AppState.GENERATING
            }
            className="w-full h-10 shadow-sm"
          >
            {appState === AppState.GENERATING
              ? "Рендеринг..."
              : "Сгенерировать"}
          </Button>
          {errorMsg && (
            <div className="mt-3 rounded-md border border-red-900/50 bg-red-950/30 p-2.5 text-xs text-red-400 leading-relaxed">
              {errorMsg}
            </div>
          )}
        </div>
      </aside>

      {/* Canvas Area */}
      <main className="flex-1 relative overflow-auto custom-scrollbar canvas-bg z-10">
        <div className="min-h-full min-w-full p-12 md:p-24 flex flex-col items-center">
          {appState === AppState.IDLE && history.length === 0 && (
            <div className="m-auto flex flex-col items-center justify-center text-zinc-500 max-w-sm text-center space-y-4">
              <div className="p-4 rounded-xl bg-[#252526] border border-[#383838] shadow-lg mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-zinc-300">Холст пуст</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Настройте параметры слева и нажмите «Сгенерировать», чтобы
                создать свой первый шедевр.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 w-full max-w-[1600px] place-items-center">
            {/* Global Generating Placeholder for new items */}
            {appState === AppState.GENERATING && generatingItemId === null && (
              <div className="w-full flex flex-col gap-3">
                <div className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                  Рендеринг...
                </div>
                <div className="aspect-video w-full rounded-lg border border-[#383838] bg-[#252526] shadow-2xl overflow-hidden relative">
                  <div className="absolute inset-0 shiny-skeleton"></div>
                </div>
              </div>
            )}

            {/* History Cards */}
            {history.map((item, index) => {
              const currentVersion = item.versions[item.activeVersionIndex];
              const isGeneratingThisEdit = generatingItemId === item.id;

              return (
                <div key={item.id} className="w-full flex flex-col gap-3 group">
                  <div className="text-xs font-medium text-zinc-500 flex items-center justify-between">
                    <span>
                      Фрейм {history.length - index} •{" "}
                      {new Date(currentVersion.timestamp).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-[#383838] text-zinc-300 px-2 py-0.5 rounded text-[10px]">
                        {item.style}
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === item.id ? null : item.id,
                            );
                          }}
                          className="text-zinc-400 hover:text-zinc-200 px-1 py-0.5 cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                          </svg>
                        </button>
                        {openMenuId === item.id && (
                          <>
                            {/* Invisible overlay to catch outside clicks */}
                            <div
                              className="fixed inset-0 z-20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                              }}
                            ></div>
                            <div className="absolute right-0 top-full mt-1 bg-[#252526] border border-[#383838] rounded-md shadow-xl z-30 py-1 w-36">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(item.id);
                                  setEditPrompt("");
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-[#383838] hover:text-white transition-colors"
                              >
                                Редактировать
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(currentVersion.url);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-[#383838] hover:text-white transition-colors"
                              >
                                Скачать
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="aspect-video w-full rounded-lg border border-[#383838] bg-[#252526] shadow-xl overflow-hidden relative group/canvas">
                    {isGeneratingThisEdit ? (
                      <div className="absolute inset-0 shiny-skeleton flex items-center justify-center z-10">
                        <div className="z-20 text-white text-sm font-medium flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full border border-[#383838]">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                          Рендеринг версии...
                        </div>
                      </div>
                    ) : (
                      <>
                        <img
                          src={currentVersion.url}
                          alt={item.topic}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/canvas:scale-[1.02]"
                        />

                        {/* Mini Previews for versions */}
                        {item.versions.length > 1 && (
                          <div className="absolute top-3 left-3 flex gap-2 z-20 overflow-x-auto max-w-[80%] custom-scrollbar pb-1 pointer-events-auto">
                            {item.versions.map((v, i) => (
                              <button
                                key={v.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistory((prev) =>
                                    prev.map((h) =>
                                      h.id === item.id
                                        ? { ...h, activeVersionIndex: i }
                                        : h,
                                    ),
                                  );
                                }}
                                className={`w-14 h-9 rounded-sm border overflow-hidden shadow-lg transition-all flex-shrink-0 bg-black ${
                                  i === item.activeVersionIndex
                                    ? "border-white ring-2 ring-white/20 scale-105"
                                    : "border-[#383838] opacity-70 hover:opacity-100 hover:border-zinc-400"
                                }`}
                                title={v.prompt || "Оригинал"}
                              >
                                <img
                                  src={v.url}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}

                        {editingId === item.id ? (
                          <div className="absolute inset-0 bg-black/80 flex flex-col justify-end p-4 z-30">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                autoFocus
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleEditGenerate(item);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                placeholder="Что изменить? (Enter для отправки)"
                                className="flex-1 bg-[#1e1e1e] border border-[#383838] rounded-md px-3 py-2 text-sm text-zinc-50 outline-none focus:border-zinc-400"
                              />
                              <button
                                onClick={() => handleEditGenerate(item)}
                                className="px-4 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200 transition-colors"
                              >
                                Отправить
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 bg-[#383838] text-white text-sm font-medium rounded-md hover:bg-[#4d4d4d] transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/canvas:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4 z-10 pointer-events-none">
                            <div className="flex items-center justify-between translate-y-4 group-hover/canvas:translate-y-0 transition-transform duration-200 pointer-events-auto">
                              <p className="text-sm font-medium text-white truncate pr-4 drop-shadow-md">
                                {item.topic}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(currentVersion.url);
                                }}
                                className="h-8 px-3 inline-flex items-center justify-center rounded-md text-xs font-medium bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm flex-shrink-0"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1.5"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" x2="12" y1="15" y2="3" />
                                </svg>
                                Скачать
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Global CSS injections for custom UI scrollbars and canvas background */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #404040;
          border-radius: 4px;
          border: 2px solid #252526;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #525252;
        }

        .canvas-bg {
          background-image: radial-gradient(#383838 1px, transparent 1px);
          background-size: 24px 24px;
          background-position: -12px -12px;
        }

        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .shiny-skeleton {
          position: absolute;
          inset: 0;
          background-color: #252526;
          overflow: hidden;
        }
        .shiny-skeleton::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(90deg, transparent 0, rgba(255, 255, 255, 0.04) 20%, rgba(255, 255, 255, 0.08) 60%, transparent);
          animation: shimmer 2s infinite ease-in-out;
        }
      `,
        }}
      />
    </div>
  );
};

export default App;
