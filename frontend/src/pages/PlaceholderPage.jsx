import { motion } from 'framer-motion';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function PlaceholderPage({ title, description = 'This section is ready for the next ERP view.' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <PageHeader
        eyebrow="Module"
        title={title}
        description={description}
        actions={[<Button key="1" variant="primary">Create record</Button>]}
      />
      <Card className="p-8">
        <h2 className="text-lg font-semibold text-slate-900">Coming next</h2>
        <p className="mt-2 text-sm text-slate-600">This placeholder is prepared for the detailed page layout for {title.toLowerCase()}.</p>
      </Card>
    </motion.div>
  );
}
