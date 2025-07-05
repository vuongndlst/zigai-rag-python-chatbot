/* app/components/LoadingBubble.tsx */
export default function LoadingBubble() {
  return (
    <div className="my-2 max-w-[75%] rounded-xl bg-gray-100 px-4 py-3 text-gray-500">
      <span className="animate-pulse">Đang soạn phản hồi…</span>
    </div>
  );
}
