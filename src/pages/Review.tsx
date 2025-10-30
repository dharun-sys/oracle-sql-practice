import { useParams, useNavigate } from "react-router-dom";
import MockTest from "@/components/MockTest";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return <div className="p-6">Missing review id</div>;

  return (
    <div>
      <div className="p-4">
        <button className="text-sm text-blue-600 mb-4" onClick={() => navigate(-1)}>← Back</button>
      </div>
      <MockTest onBack={() => navigate('/home')} reviewTestId={id} />
    </div>
  );
}
