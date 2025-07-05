import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Smartphone, AlertTriangle } from 'lucide-react';

interface DeviceTakeoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTakeOver: () => void;
  tableNumber: string;
  currentDeviceIp: string;
}

const DeviceTakeoverModal = ({ 
  open, 
  onOpenChange, 
  onTakeOver, 
  tableNumber,
  currentDeviceIp 
}: DeviceTakeoverModalProps) => {
  
  const handleTakeOver = () => {
    onTakeOver();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm mx-auto">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">Device Session Active</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Smartphone className="w-4 h-4" />
              <span>Table {tableNumber} is currently controlled by another device</span>
            </div>
            
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-sm">
              <p className="font-medium text-orange-800 mb-1">What you can do:</p>
              <ul className="text-orange-700 space-y-1">
                <li>• View the menu freely</li>
                <li>• Take over this session to place orders</li>
                <li>• The previous device will lose control</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Current device: {currentDeviceIp.slice(0, 10)}...
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Just Browse Menu
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleTakeOver}
            className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
          >
            Take Control
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeviceTakeoverModal;