import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, AlertTriangle, Shield, ArrowRightLeft } from 'lucide-react';

interface DeviceTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmTransfer: () => void;
  tableNumber: string;
  currentMainDeviceIp: string;
  currentDeviceIp: string;
  orderData?: any[];
}

const DeviceTransferModal = ({ 
  open, 
  onOpenChange, 
  onConfirmTransfer, 
  tableNumber,
  currentMainDeviceIp,
  currentDeviceIp,
  orderData = []
}: DeviceTransferModalProps) => {
  const [transferStep, setTransferStep] = useState<'confirm' | 'transferring' | 'success'>('confirm');
  
  const handleConfirmTransfer = async () => {
    setTransferStep('transferring');
    
    try {
      await onConfirmTransfer();
      setTransferStep('success');
      
      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        setTransferStep('confirm');
      }, 2000);
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferStep('confirm');
    }
  };

  const renderConfirmStep = () => (
    <>
      <AlertDialogHeader>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <AlertDialogTitle className="text-left">Transfer Main Device Control</AlertDialogTitle>
          </div>
        </div>
        <AlertDialogDescription className="text-left space-y-3">
          <div className="flex items-center space-x-2 text-sm">
            <Smartphone className="w-4 h-4" />
            <span>Table {tableNumber} is currently controlled by another device</span>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm space-y-2">
            <p className="font-medium text-blue-800">Transfer Details:</p>
            <div className="space-y-1 text-blue-700">
              <p>• Current main device: {currentMainDeviceIp.slice(0, 12)}...</p>
              <p>• New main device: {currentDeviceIp.slice(0, 12)}...</p>
              {orderData.length > 0 && (
                <p>• {orderData.length} cart items will be transferred</p>
              )}
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-amber-700">
                <p className="font-medium mb-1">Important:</p>
                <p>The previous device will lose control and can only view the menu. All order data will be transferred to this device.</p>
              </div>
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
        <AlertDialogCancel className="w-full sm:w-auto">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={handleConfirmTransfer}
          className="bg-blue-500 hover:bg-blue-600 w-full sm:w-auto"
        >
          Confirm Transfer
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );

  const renderTransferringStep = () => (
    <>
      <AlertDialogHeader>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
          <div>
            <AlertDialogTitle className="text-left">Transferring Control...</AlertDialogTitle>
          </div>
        </div>
        <AlertDialogDescription className="text-left">
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">
              Please wait while we transfer the session control to this device.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <AlertDialogHeader>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <AlertDialogTitle className="text-left">Transfer Complete!</AlertDialogTitle>
          </div>
        </div>
        <AlertDialogDescription className="text-left">
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-green-700 font-medium">
              You now have main device control for Table {tableNumber}
            </p>
            <p className="text-xs text-gray-600">
              You can now place orders and manage the dining session.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
    </>
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm mx-auto">
        {transferStep === 'confirm' && renderConfirmStep()}
        {transferStep === 'transferring' && renderTransferringStep()}
        {transferStep === 'success' && renderSuccessStep()}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeviceTransferModal;