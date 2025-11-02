import { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, Chip, Card, CardBody } from '@heroui/react';
import Editor from '@monaco-editor/react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { validateStatementForSignal } from '../../utils/ottlValidation';

interface RawOttlEditorModalProps {
  isOpen: boolean;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
  onRevert: () => void;
  hasCustomEdits: boolean;
  transformationCount?: number;
}

/**
 * RawOttlEditorModal - exposes direct editing of generated OTTL YAML
 * Provides Monaco-based editor with save/revert workflows for power users (FR-17)
 */
export function RawOttlEditorModal({
  isOpen,
  initialValue,
  onSave,
  onClose,
  onRevert,
  hasCustomEdits,
  transformationCount = 0,
}: RawOttlEditorModalProps) {
  const [draft, setDraft] = useState(initialValue);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [signalValidationErrors, setSignalValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialValue);
      setValidationError(null);
    }
  }, [initialValue, isOpen]);

  const handleValidate = () => {
    try {
      // Basic YAML validation
      if (!draft.trim()) {
        setValidationError('OTTL configuration cannot be empty');
        return;
      }
      setValidationError(null);

      // Signal compatibility validation
      const errors: string[] = [];
      const lines = draft.split('\n');
      let currentSignal: 'trace' | 'metric' | 'log' | null = null;

      lines.forEach((line, idx) => {
        // Detect signal section
        if (line.match(/^\s*(trace|metric|log)_statements:/)) {
          const match = line.match(/^\s*(trace|metric|log)_statements:/);
          currentSignal = match?.[1] as 'trace' | 'metric' | 'log';
        }

        // Check statements
        if (currentSignal && line.trim().startsWith('- ') && !line.includes('context:')) {
          const statement = line.replace(/^\s*-\s*/, '').trim();
          if (statement && !statement.startsWith('#')) {
            const validation = validateStatementForSignal(statement, currentSignal);
            if (!validation.valid) {
              errors.push(`Line ${idx + 1}: ${validation.errors.join('; ')}`);
            }
          }
        }
      });

      setSignalValidationErrors(errors);
    } catch (err) {
      setValidationError('Invalid YAML syntax');
    }
  };

  const handleSave = () => {
    if (!draft.trim()) {
      setValidationError('OTTL cannot be empty. Provide at least one statement before saving.');
      return;
    }

    // Run validation before saving
    handleValidate();

    setValidationError(null);
    onSave(draft);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[90vh]',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 bg-surface-soft/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Raw OTTL Editor</h2>
              <p className="text-sm text-text-secondary">
                Fine-tune the generated OTTL YAML before exporting or deploying.
              </p>
            </div>
            {hasCustomEdits ? (
              <Chip color="warning" variant="flat" size="sm" className="border border-warning/40">
                Custom edits active
              </Chip>
            ) : (
              <Chip size="sm" variant="flat" className="border border-border/60 bg-background-soft/70 text-text-secondary">
                Synced with visual builder
              </Chip>
            )}
          </div>
        </ModalHeader>

        <ModalBody className="bg-surface/95">
          <div className="h-[460px] rounded-xl border border-border/60 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="yaml"
              value={draft}
              onChange={(value) => setDraft(value ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          {validationError && (
            <Textarea
              isReadOnly
              value={validationError}
              color="warning"
              variant="faded"
              className="mt-3"
            />
          )}

          {!hasCustomEdits && transformationCount > 0 && (
            <Card className="mt-3 bg-primary/10 border border-primary/40">
              <CardBody className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-primary mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-primary">Auto-synced with visual pipeline</p>
                    <p className="text-text-secondary mt-1">
                      This OTTL is generated from {transformationCount} transformation{transformationCount !== 1 ? 's' : ''}. 
                      Changes here will override the visual builder until you revert.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {signalValidationErrors.length > 0 && (
            <Card className="mt-3 bg-danger/10 border border-danger/40">
              <CardBody className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-danger mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-danger">Signal Compatibility Issues</p>
                    <ul className="text-text-secondary mt-2 space-y-1 list-disc list-inside">
                      {signalValidationErrors.slice(0, 5).map((error, idx) => (
                        <li key={idx} className="text-xs">{error}</li>
                      ))}
                      {signalValidationErrors.length > 5 && (
                        <li className="text-xs italic">...and {signalValidationErrors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </ModalBody>

        <ModalFooter className="bg-surface-soft/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="light"
              className="bg-background-soft/70 text-text-secondary"
              onPress={onRevert}
              isDisabled={!hasCustomEdits}
            >
              Revert to visual pipeline
            </Button>
            <Button
              variant="light"
              className="bg-background-soft/70 text-text-secondary"
              onPress={onClose}
            >
              Cancel
            </Button>
          </div>
          <Button color="primary" onPress={handleSave}>
            Save raw OTTL
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
