import { Box, Button, Table, Text } from "@chakra-ui/react"
import { Trash2 } from "lucide-react"
import { REPORT_TABLE_MAX_HEIGHT } from "../constants"
import type { ReportTemplateListItem } from "@/api/customFormReports"

interface ReportTemplatesTableProps {
  templates: ReportTemplateListItem[]
  isFetching: boolean
  onDelete: (template: ReportTemplateListItem) => void
}

export function ReportTemplatesTable({ templates, isFetching, onDelete }: ReportTemplatesTableProps) {
  return (
    <Box overflowX="auto" maxH={REPORT_TABLE_MAX_HEIGHT} opacity={isFetching ? 0.6 : 1}>
      <Table.Root variant="line" size="sm">
        <Table.Header>
          <Table.Row bg="app.bg">
            <Table.ColumnHeader px={6} py={3} fontWeight="800">
              Name
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3} fontWeight="800">
              Module
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3} fontWeight="800" textAlign="center">
              Columns
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3} fontWeight="800" textAlign="center">
              Actions
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {templates.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={4} py={14}>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="700" color="text.primary">
                    No saved templates yet
                  </Text>
                  <Text mt={2} fontSize="sm" color="text.secondary">
                    Build a report, pick its columns, then save the selection as a template.
                  </Text>
                </Box>
              </Table.Cell>
            </Table.Row>
          ) : (
            templates.map((template) => (
              <Table.Row key={template.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                <Table.Cell px={6} py={4} fontSize="sm" fontWeight="700" color="text.primary">
                  {template.name}
                </Table.Cell>
                <Table.Cell px={4} py={4} fontSize="sm" color="text.secondary">
                  {template.moduleName}
                </Table.Cell>
                <Table.Cell px={4} py={4} fontSize="sm" color="text.secondary" textAlign="center">
                  {template.columnCount}
                </Table.Cell>
                <Table.Cell px={4} py={4} textAlign="center">
                  <Button
                    type="button"
                    variant="outline"
                    colorPalette="red"
                    aria-label={`Delete ${template.name}`}
                    title={`Delete ${template.name}`}
                    borderRadius="full"
                    h="36px"
                    w="36px"
                    minW="36px"
                    p={0}
                    cursor="pointer"
                    onClick={() => onDelete(template)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
