import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', loading, onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="max-w-md">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}