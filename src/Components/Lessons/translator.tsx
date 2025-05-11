import React, { useState, useEffect } from "react";
import TranslationService from "../../Services/translator";

const TranslatorComponent: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  // Check model loading status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const startLoadingModel = async () => {
      try {
        await TranslationService.getTranslator();
        setIsModelLoading(false);
      } catch (err) {
        console.error("Error loading model:", err);
        setModelLoadError(
          "Failed to load translation model. Please try again later."
        );
        setIsModelLoading(false); // Stop loading if error
      }
    };

    startLoadingModel();

    // Poll loading progress
    intervalId = setInterval(() => {
      if (!TranslationService.isModelLoading()) {
        clearInterval(intervalId);
        setIsModelLoading(false);
      }
    }, 500);

    return () => clearInterval(intervalId); // Clean up when component unmounts
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
      setError("Translation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">English to Twi Translator</h2>

      <div className="mb-4">
        <label className="block mb-2">English Text:</label>
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isModelLoading || modelLoadError !== null}
        />
      </div>

      <button
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
        onClick={handleTranslate}
        disabled={
          isLoading ||
          !inputText.trim() ||
          isModelLoading ||
          modelLoadError !== null
        }
      >
        {isLoading ? "Translating..." : "Translate"}
      </button>

      {/* Show errors nicely */}
      {error && <div className="text-red-500 mt-2">{error}</div>}

      {modelLoadError && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
          {modelLoadError}
        </div>
      )}

      {isModelLoading && !modelLoadError && (
        <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
          Loading translation model... This may take a while on first use.
        </div>
      )}

      {translatedText && (
        <div className="mt-4">
          <label className="block mb-2">Twi Translation:</label>
          <div className="p-3 bg-gray-100 rounded">{translatedText}</div>
        </div>
      )}
    </div>
  );
};

export default TranslatorComponent;
