import { Manifest } from '@/lib/api/manifests';

interface OcrViewerProps {
  manifest: Manifest;
}

export function OcrViewer({ manifest }: OcrViewerProps) {
  const extractedData = (manifest.extractedData as any) || {};
  const extractionInfo = extractedData._extraction_info || {};

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">OCR Extraction Results</h3>

      {/* Overall Confidence */}
      {extractionInfo.confidence !== undefined && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Confidence</span>
            <span className="text-lg font-bold text-gray-900">
              {Math.round(extractionInfo.confidence * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-indigo-600"
              style={{ width: `${extractionInfo.confidence * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Field Confidences */}
      {extractionInfo.field_confidences && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Field-by-Field Confidence</h4>
          <div className="space-y-2">
            {Object.entries(extractionInfo.field_confidences).map(([field, confidence]) => (
              <div key={field} className="flex items-center justify-between p-2 bg-white border rounded">
                <span className="text-sm text-gray-600 font-mono">{field}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        (confidence as number) >= 0.9
                          ? 'bg-green-500'
                          : (confidence as number) >= 0.7
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${(confidence as number) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900 w-12 text-right">
                    {Math.round((confidence as number) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OCR Issues */}
      {extractionInfo.ocr_issues && extractionInfo.ocr_issues.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">OCR Issues Detected</h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <ul className="space-y-2">
              {extractionInfo.ocr_issues.map((issue: string, i: number) => (
                <li key={i} className="text-sm text-red-700 flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Uncertain Fields */}
      {extractionInfo.uncertain_fields && extractionInfo.uncertain_fields.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Uncertain Fields</h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ul className="space-y-2">
              {extractionInfo.uncertain_fields.map((field: string, i: number) => (
                <li key={i} className="text-sm text-yellow-700 flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-mono">{field}</span> - Please verify this value
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Raw OCR Data */}
      {extractionInfo.raw_ocr_text && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Raw OCR Text</h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
              {extractionInfo.raw_ocr_text}
            </pre>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!extractionInfo.confidence &&
        !extractionInfo.field_confidences &&
        !extractionInfo.ocr_issues &&
        !extractionInfo.uncertain_fields &&
        !extractionInfo.raw_ocr_text && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No OCR data available for this manifest.</p>
          </div>
        )}
    </div>
  );
}
