import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { documentApi, patientApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { MedicalDocument, DocumentExtraction } from '../../types';

export function DocumentUpload() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('PRESCRIPTION');
  const [extractionResult, setExtractionResult] = useState<DocumentExtraction | null>(null);

  useEffect(() => {
    if (user) {
      patientApi.getByUserId(user.id)
        .then(pat => {
          setPatientId(pat.id);
          return patientApi.getDocuments(pat.id);
        })
        .then(setDocuments)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setExtractionResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !patientId) return;
    setUploading(true);
    try {
      const doc = await documentApi.upload(selectedFile, patientId, docType);
      setDocuments(prev => [doc, ...prev]);
      
      // 2. Process (Extract AI data)
      const extraction = await documentApi.process(doc.id);
      setExtractionResult(extraction);
      
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to upload and process document.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('docs.title', 'Medical Documents')}</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardBody>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t('docs.upload_title', 'Upload New Document')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('docs.doc_type', 'Document Type')}</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-500"
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                >
                  <option value="PRESCRIPTION">{t('docs.prescription', 'Prescription')}</option>
                  <option value="LAB_REPORT">{t('docs.lab_report', 'Lab Report')}</option>
                  <option value="DISCHARGE_SUMMARY">{t('docs.discharge_summary', 'Discharge Summary')}</option>
                  <option value="IMAGING">{t('docs.imaging', 'Imaging / X-Ray Report')}</option>
                </select>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <div className="text-4xl mb-3">📄</div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile ? selectedFile.name : t('docs.tap_upload', 'Tap to upload or drag & drop')}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t('docs.format_hint', 'PDF, PNG, JPG up to 10MB')}</p>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleUpload} 
                disabled={!selectedFile || uploading}
                loading={uploading}
              >
                {t('docs.upload_btn', 'Upload & Extract AI Data')}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* AI Extraction Results */}
        {extractionResult && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <Card className="border-teal-200 shadow-md">
              <CardBody>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">✨</span>
                  <h2 className="text-lg font-bold text-teal-800">{t('docs.extracted_title', 'AI Extracted Data')}</h2>
                </div>
                
                <div className="bg-teal-50 rounded-lg p-4 mb-4 text-sm">
                  <p className="font-medium text-teal-900 mb-2">{t('docs.preview_text', 'Extracted Text Preview:')}</p>
                  <p className="text-teal-800 line-clamp-3 italic">"{extractionResult.extracted_text}"</p>
                </div>
                
                {extractionResult.extracted_data && (
                  <div className="space-y-4">
                    {extractionResult.extracted_data.diagnoses && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t('docs.diagnoses', 'Diagnoses')}</p>
                        <div className="flex flex-wrap gap-2">
                          {extractionResult.extracted_data.diagnoses.map((d: string, i: number) => (
                            <span key={i} className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-medium border border-red-100">{d}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {extractionResult.extracted_data.medications && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t('docs.medications', 'Medications found')}</p>
                        <ul className="space-y-2">
                          {extractionResult.extracted_data.medications.map((m: any, i: number) => (
                            <li key={i} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded border border-gray-100">
                              <span className="font-medium text-gray-900">{m.name}</span>
                              <span className="text-gray-500">{m.dosage} - {m.frequency}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {extractionResult.extracted_data.lab_values && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t('docs.lab_results', 'Lab Results')}</p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              <th className="pb-1 font-medium">Test</th>
                              <th className="pb-1 font-medium">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {extractionResult.extracted_data.lab_values.map((l: any, i: number) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="py-2 text-gray-900">{l.test}</td>
                                <td className={`py-2 font-medium ${l.is_abnormal ? 'text-red-600' : 'text-green-600'}`}>
                                  {l.value} {l.unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Existing Documents */}
        <div className="md:col-span-2 mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('docs.past_docs', 'Your Past Documents')}</h2>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('docs.no_docs', 'No documents uploaded yet.')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <Card key={doc.id}>
                  <CardBody className="p-4 flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl shrink-0">
                      📄
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 text-sm break-all [overflow-wrap:anywhere]" title={doc.file_name}>{doc.file_name}</h3>
                      <p className="text-xs text-gray-500 mb-2">{t('docs.' + doc.document_type.toLowerCase(), doc.document_type)} • {((doc.file_size || 0) / 1024).toFixed(1)} KB</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.ocr_status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {t('status.' + doc.ocr_status.toLowerCase(), doc.ocr_status)}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
