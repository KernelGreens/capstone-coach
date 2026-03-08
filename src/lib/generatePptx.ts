import pptxgen from "pptxgenjs";

interface Slide {
  title: string;
  subtitle?: string;
  bullets: string[];
  notes: string;
  visualSuggestion?: string;
}

export async function generatePptx(slides: Slide[], meetingTitle: string) {
  const pptx = new pptxgen();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Capstone Coach";
  pptx.subject = meetingTitle;
  pptx.title = meetingTitle;

  // Define colors
  const PRIMARY = "1a56db";
  const DARK = "1e293b";
  const MUTED = "64748b";
  const ACCENT = "3b82f6";
  const LIGHT_BG = "f8fafc";

  slides.forEach((slide, index) => {
    const s = pptx.addSlide();

    if (index === 0) {
      // Title slide
      s.background = { color: PRIMARY };
      s.addText(slide.title, {
        x: 0.8,
        y: 1.5,
        w: "85%",
        fontSize: 36,
        bold: true,
        color: "FFFFFF",
        fontFace: "Calibri",
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.8,
          y: 3.2,
          w: "85%",
          fontSize: 20,
          color: "d1d5db",
          fontFace: "Calibri",
        });
      }
      // Accent line
      s.addShape(pptx.ShapeType.rect, {
        x: 0.8,
        y: 3.0,
        w: 2.5,
        h: 0.04,
        fill: { color: "FFFFFF" },
      });
    } else if (index === slides.length - 1) {
      // Closing slide
      s.background = { color: DARK };
      s.addText(slide.title, {
        x: 0.8,
        y: 1.8,
        w: "85%",
        fontSize: 32,
        bold: true,
        color: "FFFFFF",
        fontFace: "Calibri",
        align: "center",
      });
      if (slide.bullets.length > 0) {
        s.addText(
          slide.bullets.map((b) => ({ text: b, options: { bullet: true, color: "d1d5db" } })),
          {
            x: 1.5,
            y: 3.2,
            w: "70%",
            fontSize: 18,
            color: "d1d5db",
            fontFace: "Calibri",
            align: "center",
            lineSpacingMultiple: 1.5,
          }
        );
      }
    } else {
      // Content slide
      s.background = { color: LIGHT_BG };

      // Top accent bar
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: "100%",
        h: 0.06,
        fill: { color: ACCENT },
      });

      // Title
      s.addText(slide.title, {
        x: 0.8,
        y: 0.4,
        w: "85%",
        fontSize: 26,
        bold: true,
        color: DARK,
        fontFace: "Calibri",
      });

      // Subtitle if present
      let bulletY = 1.3;
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.8,
          y: 1.1,
          w: "85%",
          fontSize: 16,
          color: MUTED,
          fontFace: "Calibri",
          italic: true,
        });
        bulletY = 1.7;
      }

      // Bullet points
      if (slide.bullets.length > 0) {
        s.addText(
          slide.bullets.map((b) => ({
            text: b,
            options: { bullet: { type: "bullet" }, color: DARK },
          })),
          {
            x: 0.8,
            y: bulletY,
            w: "85%",
            fontSize: 16,
            fontFace: "Calibri",
            lineSpacingMultiple: 1.6,
            valign: "top",
          }
        );
      }

      // Visual suggestion as a note at the bottom
      if (slide.visualSuggestion) {
        s.addText(`💡 Visual: ${slide.visualSuggestion}`, {
          x: 0.8,
          y: 6.5,
          w: "85%",
          fontSize: 10,
          color: MUTED,
          fontFace: "Calibri",
          italic: true,
        });
      }
    }

    // Speaker notes
    if (slide.notes) {
      s.addNotes(slide.notes);
    }
  });

  await pptx.writeFile({ fileName: `${meetingTitle.replace(/[^a-zA-Z0-9 ]/g, "")}_Slides.pptx` });
}
