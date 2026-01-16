import { Modal } from 'antd'

interface ConfirmModalProps {
  title: string
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  children?: React.ReactNode
}

const ConfirmModal = ({
  title,
  open,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  children,
}: ConfirmModalProps) => (
  <Modal
    title={title}
    open={open}
    onOk={onConfirm}
    onCancel={onCancel}
    okText={confirmText}
    cancelText={cancelText}
  >
    {children}
  </Modal>
)

export default ConfirmModal
