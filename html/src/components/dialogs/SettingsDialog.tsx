import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import config from '../../config';
import { AdvancedModeToggle, HideField } from '../form';

// Props for SettingsDialog component
interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

// Settings dialog component for API configuration
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
}) => {
  const { apiKey, setApiKey } = useAuth();
  const { advancedMode, setAdvancedMode } = useSettings();
  const [localApiKey, setLocalApiKey] = useState('');
  const [success, setSuccess] = useState(false);

  // Initialize local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalApiKey(apiKey || '');
      setSuccess(false);
    }
  }, [open, apiKey]);

  // Handle save
  const handleSave = () => {
    setApiKey(localApiKey);
    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <Modal show={open} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {success && (
          <Alert variant="success" className="mb-3">
            Settings saved successfully!
          </Alert>
        )}
        
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>API URL</Form.Label>
            <Form.Control type="text" value={config.apiUrl} readOnly disabled />
            <Form.Text className="text-muted">Source: {config.apiSource}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>SRT host</Form.Label>
            <Form.Control type="text" value={config.srtHost} readOnly disabled />
            <Form.Text className="text-muted">
              Source: {config.srtHostSource}. Set API_HOST, STATS_HOST and SRT_HOST (or the legacy
              APP_URL) on the UI container to override.
            </Form.Text>
          </Form.Group>

          {config.warnings.length > 0 && (
            <Alert variant="warning" className="mb-3 small">
              {config.warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </Alert>
          )}
          
          <HideField
            label="API Key"
            value={localApiKey}
            onChange={setLocalApiKey}
            placeholder="Enter your API key"
            helpText="Your SRT Live Server API key for authentication"
          />

          <hr />

          <AdvancedModeToggle
            checked={advancedMode}
            onChange={setAdvancedMode}
          />
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="primary"
          onClick={handleSave}
        >
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}; 