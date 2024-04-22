import Button from "components/Button/Button";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: any;
};

export default function Pagination({ page, pageCount, onPageChange }: Props) {
  return (
    <div className="pagination">
      <div className="pagination-buttons">
        <Button variant="secondary" onClick={() => onPageChange(1)} disabled={page <= 1}>
          {"|<"}
        </Button>
        <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {"<"}
        </Button>
        <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          {">"}
        </Button>
        <Button variant="secondary" onClick={() => onPageChange(pageCount)} disabled={page >= pageCount}>
          {">|"}
        </Button>
      </div>
    </div>
  );
}
