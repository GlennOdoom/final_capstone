class TranslationService {
  private static readonly HF_API_URL = 'https://science-word-twi-schneezy.hf.space/run/predict';

  private static modelLoaded = false;

  static async getTranslator(): Promise<void> {
    if (!this.modelLoaded) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.modelLoaded = true;
    }
  }

  static isModelLoading(): boolean {
    return !this.modelLoaded;
  }

  static async translateText(text: string): Promise<string> {
    try {
      const response = await fetch(this.HF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [text],  // Gradio expects { data: [...] }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gradio API call failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Gradio returns results inside "data" array
      if (data?.data && data.data.length > 0) {
        return data.data[0];
      } else {
        return '';
      }
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }
}

export default TranslationService;
