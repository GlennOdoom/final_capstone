import React, { useState, useEffect } from "react";
import TranslationService from "../../Services/translator";

const TranslatorComponent: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const gradioUrl = "https://eb6a16cd91d0f6abd4.gradio.live/";

  // Check if the translation model is ready
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const initializeTranslator = async () => {
      try {
        await TranslationService.getTranslator();
        setIsModelLoading(false);
      } catch (err) {
        console.error("Error initializing translator:", err);
        setError(
          "Failed to initialize the translation service. Please try again later."
        );
        setIsModelLoading(false);
      }
    };

    initializeTranslator();

    // Poll for model loading status
    intervalId = setInterval(() => {
      if (!TranslationService.isModelLoading()) {
        clearInterval(intervalId);
        setIsModelLoading(false);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      const translated = await TranslationService.translateText(inputText);
      setTranslatedText(translated);
    } catch (err) {
      console.error("Translation failed:", err);
      setError(
        "Translation failed. Please try again or use the direct Gradio interface."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterface = () => {
    setShowIframe(!showIframe);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 border rounded-lg shadow-md bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center">
        English to Twi Translator
      </h1>

      <div className="mb-2 flex justify-end">
        <button
          onClick={toggleInterface}
          className="text-blue-600 hover:text-blue-800 underline text-sm"
        >
          {showIframe ? "Use Simple Interface" : "Use Full Gradio Interface"}
        </button>
      </div>

      {!showIframe ? (
        <>
          <div className="mb-4">
            <label className="block mb-2 font-medium">English Text:</label>
            <textarea
              className="w-full p-3 border rounded-md focus:ring focus:ring-blue-200 focus:border-blue-500"
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to translate..."
              disabled={isModelLoading}
            />
          </div>

          <div className="mb-4">
            <button
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-blue-300"
              onClick={handleTranslate}
              disabled={isLoading || !inputText.trim() || isModelLoading}
            >
              {isLoading ? <span>Translating...</span> : <span>Translate</span>}
            </button>
          </div>

          {isModelLoading && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              Initializing translation service... Please wait.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {translatedText && (
            <div className="mt-6">
              <h2 className="font-medium mb-2">Twi Translation:</h2>
              <div className="p-4 bg-gray-50 border rounded-md">
                {translatedText}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 border rounded-md overflow-hidden">
          <iframe
            src={gradioUrl}
            title="Gradio English to Twi Translator"
            className="w-full h-96"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          ></iframe>
          <div className="p-2 bg-gray-50 text-sm text-gray-600">
            This is the direct interface to the Gradio translation application.
            You can interact with it directly.
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        <p>
          Translation service powered by Hugging Face Gradio API.
          {!showIframe &&
            "You can also use the full Gradio interface for more options."}
        </p>
      </div>
    </div>
  );
};

export default TranslatorComponent;
