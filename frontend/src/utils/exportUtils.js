import html2canvas from 'html2canvas';

/**
 * Export chart/metrics section as PNG
 * @param {HTMLElement} element - DOM element to capture
 * @param {string} filename - Output filename (without extension)
 * @returns {Promise<void>}
 */
export async function downloadChartAsPNG(element, filename = 'portfolio') {
  if (!element) {
    throw new Error('No element provided for export');
  }

  try {
    // Scroll to the element to ensure it's in view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Wait a bit for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality (2x resolution)
      logging: false,
      allowTaint: true,
      useCORS: true,
      windowHeight: element.scrollHeight,
      windowWidth: element.scrollWidth,
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to generate screenshot. Please try again.');
  }
}

/**
 * Export multiple sections as single PNG (future enhancement)
 * @param {Array<{element: HTMLElement, label: string}>} sections - Sections to capture
 * @param {string} filename - Output filename
 * @returns {Promise<void>}
 */
export async function downloadMultiSectionPNG(sections, filename = 'portfolio') {
  if (!sections || sections.length === 0) {
    throw new Error('No sections provided for export');
  }

  try {
    // Create a container to hold all sections
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    // Clone each section and add to container
    for (const section of sections) {
      if (section.element) {
        const clone = section.element.cloneNode(true);
        if (section.label) {
          const label = document.createElement('h2');
          label.textContent = section.label;
          label.style.fontSize = '24px';
          label.style.fontWeight = 'bold';
          label.style.marginBottom = '16px';
          container.appendChild(label);
        }
        container.appendChild(clone);
      }
    }

    // Capture the combined container
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      allowTaint: true,
      useCORS: true,
    });

    // Clean up
    document.body.removeChild(container);

    // Download
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  } catch (error) {
    console.error('Multi-section export failed:', error);
    throw new Error('Failed to generate combined screenshot. Please try again.');
  }
}
