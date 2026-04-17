import { useEffect, useRef } from "react";
import AdminMonitoringPanel from "../../components/dashboard/AdminMonitoringPanel.jsx";
import AssistantPanel from "../../components/dashboard/AssistantPanel.jsx";
import MobileOperatorConsole from "../../components/dashboard/MobileOperatorConsole.jsx";
import { useAppContext } from "../../context/useAppContext.js";

export default function CameraPage() {
  const {
    activeOperatorId,
    adminHubReady,
    detections,
    handleApproveRequest,
    handleDenyRequest,
    handleSendMessage,
    handleVoiceCapture,
    inputValue,
    isListening,
    isMobileDevice,
    lang,
    messages,
    mobileOperators,
    onInputChange,
    onSetOperator,
    onStatusChange,
    operatorStreams,
    pendingRequests,
    roleConfig,
    roleKey,
    setDetections,
  } = useAppContext();
  const videoRefs = useRef({});
  const shouldRenderOperatorConsole = isMobileDevice || roleKey !== "admin";

  useEffect(() => {
    Object.entries(operatorStreams).forEach(([operatorId, streamEntry]) => {
      const video = videoRefs.current[operatorId];

      if (video && streamEntry?.stream && video.srcObject !== streamEntry.stream) {
        video.srcObject = streamEntry.stream;
      }
    });
  }, [operatorStreams]);

  return (
    <div className="space-y-6 p-4 md:p-6 xl:p-8">
      {shouldRenderOperatorConsole ? (
        <div className="space-y-6">
          <MobileOperatorConsole
            lang={lang}
            onStatusChange={onStatusChange}
            onSubmitApprovalRequest={() => {
              onStatusChange(lang === "es" ? "Solicitud enviada al admin" : "Request sent to admin");
            }}
            operators={mobileOperators}
            roleConfig={roleConfig}
            roleKey={roleKey}
            selectedOperatorId={activeOperatorId}
            setSelectedOperatorId={onSetOperator}
          />
          {roleConfig.canUseVoiceAssistant ? (
            <AssistantPanel
              detections={detections}
              inputValue={inputValue}
              isListening={isListening}
              lang={lang}
              messages={messages}
              onInputChange={onInputChange}
              onSubmit={handleSendMessage}
              onVoiceCapture={handleVoiceCapture}
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
          <AdminMonitoringPanel
            adminHubReady={adminHubReady}
            detections={detections}
            lang={lang}
            mobileOperators={mobileOperators}
            onDetectionsChange={setDetections}
            onApproveRequest={handleApproveRequest}
            onDenyRequest={handleDenyRequest}
            operatorStreams={operatorStreams}
            pendingRequests={pendingRequests}
            videoRefs={videoRefs}
          />
          <AssistantPanel
            detections={detections}
            inputValue={inputValue}
            isListening={isListening}
            lang={lang}
            messages={messages}
            onInputChange={onInputChange}
            onSubmit={handleSendMessage}
            onVoiceCapture={handleVoiceCapture}
          />
        </div>
      )}
    </div>
  );
}
