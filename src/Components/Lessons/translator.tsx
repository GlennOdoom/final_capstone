import { useState } from "react";

const TranslatorComponent = () => {
  const [showIframe, setShowIframe] = useState(true);
  const gradioUrl = "https://0122b6751a5286e563.gradio.live/";

  const toggleInterface = () => {
    setShowIframe(!showIframe);
  };

  return (
    <div className="w-full p-4 border rounded-lg shadow-md bg-white">
      <h2 className="text-2xl font-bold mb-4 text-center">
        English to Twi Translator
      </h2>

      <div className="mb-4 text-right">
        <button
          onClick={toggleInterface}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showIframe ? "Hide Gradio Interface" : "Show Gradio Interface"}
        </button>
      </div>

      {showIframe && (
        <div className="mb-4">
          <iframe
            src={gradioUrl}
            className="w-full h-[90vh] border rounded-md"
            title="English to Twi Translator"
          ></iframe>
          <div className="p-2 bg-gray-50 text-sm text-gray-600 text-center">
            This is the direct interface to the Gradio translation application.
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500 text-center">
        Translation service powered by Hugging Face Gradio API.
      </div>
    </div>
  );
};

export default TranslatorComponent;
