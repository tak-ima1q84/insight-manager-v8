import { Elysia, t } from 'elysia';
import { db } from '../db';
import { insights } from '../db/schema';
import { eq, like, or, and } from 'drizzle-orm';

export const insightRoutes = new Elysia({ prefix: '/api/insights' })
  .post('/upload', async ({ body }) => {
    try {
      const formData = body as any;
      const file = formData.file;
      
      if (!file) {
        return { error: 'No file provided' };
      }

      const timestamp = Date.now();
      // Get file extension
      const ext = file.name.split('.').pop() || 'jpg';
      // Create URL-safe filename
      const filename = `${timestamp}.${ext}`;
      const filepath = `uploads/${filename}`;
      
      await Bun.write(filepath, file);
      
      return { url: `/${filepath}` };
    } catch (error) {
      console.error('Upload error:', error);
      return { error: 'Upload failed' };
    }
  })
  .get('/', async ({ query }) => {
    const conditions = [];
    
    if (query.creationNumber) conditions.push(eq(insights.creationNumber, Number(query.creationNumber)));
    if (query.subject) conditions.push(like(insights.subject, `%${query.subject}%`));
    if (query.insightId) conditions.push(like(insights.insightId, `%${query.insightId}%`));
    if (query.status) conditions.push(eq(insights.status, query.status));
    if (query.type) conditions.push(eq(insights.type, query.type));
    if (query.mainCategory) conditions.push(eq(insights.mainCategory, query.mainCategory));
    if (query.subCategory) conditions.push(like(insights.subCategory, `%${query.subCategory}%`));
    if (query.dataCategory) conditions.push(eq(insights.dataCategory, query.dataCategory));
    if (query.logicFormula) conditions.push(like(insights.logicFormula, `%${query.logicFormula}%`));
    if (query.relatedInsight) conditions.push(like(insights.relatedInsight, `%${query.relatedInsight}%`));

    let result = conditions.length > 0
      ? await db.select().from(insights).where(and(...conditions))
      : await db.select().from(insights);

    // Filter by targetBanks (JSON array field) - support multiple selections
    if (query.targetBanks) {
      const searchBanks = Array.isArray(query.targetBanks) ? query.targetBanks : [query.targetBanks];
      result = result.filter(insight => {
        const banks = insight.targetBanks as string[] || [];
        return searchBanks.some(searchBank => banks.includes(searchBank));
      });
    }

    // Filter by targetTables (JSON array field) - support multiple selections
    if (query.targetTables) {
      const searchTables = Array.isArray(query.targetTables) ? query.targetTables : [query.targetTables];
      result = result.filter(insight => {
        const tables = insight.targetTables as string[] || [];
        return searchTables.some(searchTable => tables.includes(searchTable));
      });
    }

    return result;
  })
  .get('/:id', async ({ params }) => {
    const result = await db.query.insights.findFirst({
      where: eq(insights.id, Number(params.id)),
    });
    return result;
  })
  .post('/', async ({ body, set }) => {
    try {
      const bodyData = body as any;
      // Validate and clean the data
      const insertData = {
        ...bodyData,
        // Ensure numeric fields are properly typed
        creationNumber: bodyData.creationNumber ? Number(bodyData.creationNumber) : 1,
        displayCount: bodyData.displayCount ? Number(bodyData.displayCount) : 1,
        selectCount: bodyData.selectCount ? Number(bodyData.selectCount) : 1,
        score: bodyData.score ? String(bodyData.score) : null,
        // Ensure arrays are properly formatted
        targetBanks: Array.isArray(bodyData.targetBanks) ? bodyData.targetBanks : [],
        targetTables: Array.isArray(bodyData.targetTables) ? bodyData.targetTables : [],
        storyImages: Array.isArray(bodyData.storyImages) ? bodyData.storyImages.filter((img: string) => img && img.trim() !== '') : [],
        // Ensure date fields are properly formatted or null
        startDate: bodyData.startDate || null,
        updateDate: bodyData.updateDate || null,
        endDate: bodyData.endDate || null,
        maintenanceDate: bodyData.maintenanceDate || '2099-12-31',
      };
      
      const result = await db.insert(insights).values(insertData).returning();
      return result[0];
    } catch (error) {
      console.error('Create error:', error);
      set.status = 400;
      return { error: `Failed to create insight: ${error instanceof Error ? error.message : String(error)}` };
    }
  })
  .put('/:id', async ({ params, body, set }) => {
    try {
      const bodyData = body as any;
      
      // Helper function to safely handle date values
      const formatDateValue = (value: any) => {
        if (!value || value === '') return null;
        if (typeof value === 'string') return value;
        if (value instanceof Date) return value.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
        return null;
      };
      
      // Validate and clean the data - explicitly handle each field
      const updateData: any = {};
      
      // Only include fields that are actually provided
      if (bodyData.creationNumber !== undefined) updateData.creationNumber = Number(bodyData.creationNumber);
      if (bodyData.subject !== undefined) updateData.subject = bodyData.subject;
      if (bodyData.insightId !== undefined) updateData.insightId = bodyData.insightId;
      if (bodyData.status !== undefined) updateData.status = bodyData.status;
      if (bodyData.type !== undefined) updateData.type = bodyData.type;
      if (bodyData.mainCategory !== undefined) updateData.mainCategory = bodyData.mainCategory;
      if (bodyData.subCategory !== undefined) updateData.subCategory = bodyData.subCategory;
      if (bodyData.dataCategory !== undefined) updateData.dataCategory = bodyData.dataCategory;
      if (bodyData.logicFormula !== undefined) updateData.logicFormula = bodyData.logicFormula;
      if (bodyData.targetUsers !== undefined) updateData.targetUsers = bodyData.targetUsers;
      if (bodyData.relatedInsight !== undefined) updateData.relatedInsight = bodyData.relatedInsight;
      if (bodyData.revenueCategory !== undefined) updateData.revenueCategory = bodyData.revenueCategory;
      if (bodyData.iconType !== undefined) updateData.iconType = bodyData.iconType;
      if (bodyData.relevancePolicy !== undefined) updateData.relevancePolicy = bodyData.relevancePolicy;
      if (bodyData.relevanceScore !== undefined) updateData.relevanceScore = bodyData.relevanceScore;
      if (bodyData.nextPolicy !== undefined) updateData.nextPolicy = bodyData.nextPolicy;
      if (bodyData.nextValue !== undefined) updateData.nextValue = bodyData.nextValue;
      if (bodyData.appLink !== undefined) updateData.appLink = bodyData.appLink;
      if (bodyData.externalLink !== undefined) updateData.externalLink = bodyData.externalLink;
      if (bodyData.teaserImage !== undefined) updateData.teaserImage = bodyData.teaserImage;
      if (bodyData.maintenanceReason !== undefined) updateData.maintenanceReason = bodyData.maintenanceReason;
      if (bodyData.remarks !== undefined) updateData.remarks = bodyData.remarks;
      if (bodyData.updatedBy !== undefined) updateData.updatedBy = bodyData.updatedBy;
      
      // Handle numeric fields
      if (bodyData.displayCount !== undefined) updateData.displayCount = Number(bodyData.displayCount);
      if (bodyData.selectCount !== undefined) updateData.selectCount = Number(bodyData.selectCount);
      if (bodyData.score !== undefined) updateData.score = bodyData.score ? String(bodyData.score) : null;
      
      // Handle array fields
      if (bodyData.targetBanks !== undefined) {
        updateData.targetBanks = Array.isArray(bodyData.targetBanks) ? bodyData.targetBanks : [];
      }
      if (bodyData.targetTables !== undefined) {
        updateData.targetTables = Array.isArray(bodyData.targetTables) ? bodyData.targetTables : [];
      }
      if (bodyData.storyImages !== undefined) {
        updateData.storyImages = Array.isArray(bodyData.storyImages) 
          ? bodyData.storyImages.filter((img: string) => img && img.trim() !== '') 
          : [];
      }
      
      // Handle date fields carefully
      if (bodyData.startDate !== undefined) updateData.startDate = formatDateValue(bodyData.startDate);
      if (bodyData.updateDate !== undefined) updateData.updateDate = formatDateValue(bodyData.updateDate);
      if (bodyData.endDate !== undefined) updateData.endDate = formatDateValue(bodyData.endDate);
      if (bodyData.maintenanceDate !== undefined) {
        updateData.maintenanceDate = formatDateValue(bodyData.maintenanceDate) || '2099-12-31';
      }
      
      // Don't manually set updatedAt - let the database handle it
      
      const result = await db
        .update(insights)
        .set(updateData)
        .where(eq(insights.id, Number(params.id)))
        .returning();
      
      if (result.length === 0) {
        set.status = 404;
        return { error: 'Insight not found' };
      }
      
      return result[0];
    } catch (error) {
      console.error('Update error:', error);
      set.status = 400;
      return { error: `Failed to update insight: ${error instanceof Error ? error.message : String(error)}` };
    }
  })
  .delete('/:id', async ({ params, set }) => {
    try {
      await db.delete(insights).where(eq(insights.id, Number(params.id)));
      return { success: true };
    } catch (error) {
      set.status = 400;
      return { error: 'Failed to delete insight' };
    }
  })
  .post('/import/csv', async ({ body, set }) => {
    try {
      // In Elysia, multipart form data is parsed automatically
      // The file should be available directly in body
      const file = (body as any).file;
      
      if (!file) {
        set.status = 400;
        return { error: 'No file provided' };
      }
      
      if (typeof file.text !== 'function') {
        set.status = 400;
        return { error: 'Invalid file format - file.text is not a function' };
      }

      const text = await file.text();
      const lines = text.split('\n').filter((line: string) => line.trim());
      
      // Log line lengths for debugging
      lines.forEach((line, index) => {
        if (line.length > 5000) {
          console.warn(`Line ${index + 1} is very long (${line.length} characters). This might cause parsing issues.`);
        }
      });
      
      if (lines.length < 2) {
        set.status = 400;
        return { error: 'CSV file is empty or invalid' };
      }

      // Helper function to parse CSV line properly (handles commas in quoted fields)
      const parseCSVLine = (line: string): string[] => {
        // Handle very long lines by checking if they're properly terminated
        if (line.length > 10000) {
          console.warn(`Processing very long line (${line.length} chars)`);
        }
        
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Escaped quote
              current += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current);
        
        // Validate we have the expected number of columns
        if (result.length !== 34) {
          console.warn(`Parsed ${result.length} columns, expected 34. Line length: ${line.length}`);
        }
        
        return result;
      };

      // Helper function to safely parse JSON
      const safeJSONParse = (str: string, defaultValue: any = []) => {
        if (!str || str === '' || str === '""') return defaultValue;
        try {
          // Handle properly escaped CSV field
          let cleaned = str;
          // If wrapped in quotes, remove them and unescape internal quotes
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
          }
          return JSON.parse(cleaned);
        } catch (error) {
          console.warn('Failed to parse JSON field:', str, error);
          return defaultValue;
        }
      };

      // Skip header row
      const dataLines = lines.slice(1);
      const imported = [];
      const errors = [];

      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = parseCSVLine(dataLines[i]);
          
          // Validate minimum required fields
          if (values.length < 34) {
            throw new Error(`Insufficient columns: expected 34, got ${values.length}`);
          }

          // Parse the CSV row
          const insightData = {
            creationNumber: parseInt(values[1] || '1') || 1,
            subject: values[2] || '',
            insightId: values[3] || '',
            status: values[4] || '',
            startDate: values[5] === '' ? null : values[5],
            updateDate: values[6] === '' ? null : values[6],
            endDate: values[7] === '' ? null : values[7],
            type: values[8] || '',
            mainCategory: values[9] || '',
            subCategory: values[10] || '',
            dataCategory: values[11] || '',
            targetBanks: safeJSONParse(values[12] || '[]', []),
            logicFormula: values[13] || '',
            targetTables: safeJSONParse(values[14] || '[]', []),
            targetUsers: values[15] || '',
            relatedInsight: values[16] || '',
            revenueCategory: values[17] || '',
            iconType: values[18] || '',
            score: values[19] === '' ? null : values[19],
            relevancePolicy: values[20] || '',
            relevanceScore: values[21] || '',
            displayCount: parseInt(values[22] || '0') || 0,
            selectCount: parseInt(values[23] || '0') || 0,
            nextPolicy: values[24] || '',
            nextValue: values[25] || '',
            appLink: values[26] || '',
            externalLink: values[27] || '',
            teaserImage: values[28] === '' ? null : values[28],
            storyImages: safeJSONParse(values[29] || '[]', []),
            maintenanceDate: values[30] || '2099-12-31',
            maintenanceReason: values[31] || '',
            remarks: values[32] || '',
            updatedBy: values[33] || '',
          };

          // Basic validation
          if (!insightData.subject.trim()) {
            throw new Error('Subject is required');
          }
          if (!insightData.insightId.trim()) {
            throw new Error('Insight ID is required');
          }

          const result = await db.insert(insights).values(insightData).returning();
          imported.push(result[0]);
        } catch (error) {
          errors.push({ row: i + 2, error: String(error) });
        }
      }

      return {
        success: true,
        imported: imported.length,
        errors: errors.length,
        errorDetails: errors
      };
    } catch (error) {
      console.error('CSV import error:', error);
      set.status = 400;
      return { error: 'Failed to import CSV: ' + String(error) };
    }
  })
  .get('/export/csv', async ({ set }) => {
    const allInsights = await db.select().from(insights);
    
    const headers = [
      'ID', '作成番号', 'インサイト件名', 'インサイトID', '表示ステータス',
      '配信開始日', '更新日', '配信停止日', 'インサイトタイプ', 'メインカテゴリ',
      'サブカテゴリ', 'データカテゴリ', '対象銀行', '表示ロジック', '使用データテーブル',
      '対象ユーザー', '関連インサイト', '収益カテゴリ', 'アイコンタイプ', 'スコア',
      '関連性ポリシー', '関連性スコア', '表示回数', '選択回数', '次回表示ポリシー',
      '次回表示設定値', 'アプリ内遷移先', '外部遷移先', 'ティーザー画像', 'ストーリー画像',
      '次回メンテナンス日', 'メンテナンス理由', '備考', '更新者'
    ];

    const rows = allInsights.map(insight => [
      insight.id,
      insight.creationNumber,
      insight.subject,
      insight.insightId,
      insight.status,
      insight.startDate,
      insight.updateDate,
      insight.endDate,
      insight.type,
      insight.mainCategory,
      insight.subCategory,
      insight.dataCategory,
      JSON.stringify(insight.targetBanks),
      insight.logicFormula,
      JSON.stringify(insight.targetTables),
      insight.targetUsers,
      insight.relatedInsight,
      insight.revenueCategory,
      insight.iconType,
      insight.score,
      insight.relevancePolicy,
      insight.relevanceScore,
      insight.displayCount,
      insight.selectCount,
      insight.nextPolicy,
      insight.nextValue,
      insight.appLink,
      insight.externalLink,
      insight.teaserImage,
      JSON.stringify(insight.storyImages),
      insight.maintenanceDate,
      insight.maintenanceReason,
      insight.remarks,
      insight.updatedBy,
    ]);

    // Properly escape CSV fields (wrap in quotes and escape internal quotes)
    const escapeCSVField = (field: any): string => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      // Always wrap in quotes to avoid issues with commas, quotes, newlines, etc.
      return '"' + str.replace(/"/g, '""') + '"';
    };

    const csv = [headers.map(escapeCSVField), ...rows.map(row => row.map(escapeCSVField))]
      .map(row => row.join(','))
      .join('\n');
    
    set.headers['Content-Type'] = 'text/csv; charset=utf-8';
    set.headers['Content-Disposition'] = 'attachment; filename=insights.csv';
    
    return '\uFEFF' + csv; // BOM for Excel
  });
