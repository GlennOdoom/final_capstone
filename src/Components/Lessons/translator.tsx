import { useState, useEffect } from "react";

const TranslatorComponent = () => {
  const [showIframe, setShowIframe] = useState(true);
  const gradioUrl = "https://fcdaf54fc86ac0df70.gradio.live/";

  const toggleInterface = () => {
    setShowIframe(!showIframe);
  };

  useEffect(() => {
    document.body.style.overflow = showIframe ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showIframe]);

  return (
    <div className="fixed inset-0 z-0">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white p-4 shadow-md flex justify-between items-center">
        <h2 className="text-xl font-bold">English to Twi Translator</h2>
        <button
          onClick={toggleInterface}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showIframe ? "Hide Gradio Interface" : "Show Gradio Interface"}
        </button>
      </div>

      {/* Fullscreen Iframe */}
      {showIframe && (
        <iframe
          src={gradioUrl}
          className="absolute top-16 left-0 w-full h-[calc(100vh-4rem)] border-none"
          title="English to Twi Translator"
        ></iframe>
      )}
    </div>
  );
};

export default TranslatorComponent;
