import { env } from '../../config/env.js';
import { notion } from './client.js';

const FINANCE_CATEGORIES = [
  'food',
  'entertainment',
  'gifts',
  'transport',
  'miscellaneous',
  'work',
];

async function getFinanceDataSourceProperties() {
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: env.NOTION_FINANCE_DATA_SOURCE_ID,
  });

  return dataSource.properties || {};
}

function findConfiguredProperty(properties, configuredName, expectedType) {
  if (configuredName && properties[configuredName]?.type === expectedType) {
    return configuredName;
  }

  const normalizedName = configuredName?.toLowerCase();
  return Object.entries(properties).find(([name, property]) => (
    name.toLowerCase() === normalizedName && property.type === expectedType
  ))?.[0];
}

function buildExpenseProperty(propertyType, expense) {
  if (propertyType === 'title') {
    return {
      title: [
        {
          type: 'text',
          text: {
            content: expense,
          },
        },
      ],
    };
  }

  if (propertyType === 'rich_text') {
    return {
      rich_text: [
        {
          type: 'text',
          text: {
            content: expense,
          },
        },
      ],
    };
  }

  return null;
}

function buildCategoryProperty(propertyType, category) {
  if (propertyType === 'select') {
    return { select: { name: category } };
  }

  if (propertyType === 'multi_select') {
    return { multi_select: [{ name: category }] };
  }

  if (propertyType === 'rich_text') {
    return {
      rich_text: [
        {
          type: 'text',
          text: {
            content: category,
          },
        },
      ],
    };
  }

  return null;
}

function buildFinanceProperties({
  expense,
  amount,
  category,
  dataSourceProperties,
}) {
  const expensePropertyName = findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_FINANCE_EXPENSE_PROPERTY,
    'title',
  ) || findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_FINANCE_EXPENSE_PROPERTY,
    'rich_text',
  );

  if (!expensePropertyName) {
    throw new Error('Finance data source must have an expense title or text property.');
  }

  const expenseProperty = buildExpenseProperty(
    dataSourceProperties[expensePropertyName].type,
    expense,
  );

  const amountPropertyName = findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_FINANCE_AMOUNT_PROPERTY,
    'number',
  );

  if (!amountPropertyName) {
    throw new Error('Finance data source must have an amount number property.');
  }

  const categoryPropertyName = findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_FINANCE_CATEGORY_PROPERTY,
    'select',
  ) || findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_FINANCE_CATEGORY_PROPERTY,
    'multi_select',
  ) || findConfiguredProperty(
    dataSourceProperties,
    env.NOTION_FINANCE_CATEGORY_PROPERTY,
    'rich_text',
  );

  if (!categoryPropertyName) {
    throw new Error('Finance data source must have a category select, multi-select, or text property.');
  }

  const categoryProperty = buildCategoryProperty(
    dataSourceProperties[categoryPropertyName].type,
    category,
  );

  return {
    properties: {
      [expensePropertyName]: expenseProperty,
      [amountPropertyName]: {
        number: amount,
      },
      [categoryPropertyName]: categoryProperty,
    },
  };
}

export async function createExpense({
  expense,
  amount,
  category,
}) {
  const cleanExpense = expense?.trim();
  const cleanCategory = category?.trim().toLowerCase();

  if (!cleanExpense) {
    throw new Error('Expense is required.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number.');
  }

  if (!FINANCE_CATEGORIES.includes(cleanCategory)) {
    throw new Error(`Category must be one of: ${FINANCE_CATEGORIES.join(', ')}.`);
  }

  const dataSourceProperties = await getFinanceDataSourceProperties();
  const { properties } = buildFinanceProperties({
    expense: cleanExpense,
    amount,
    category: cleanCategory,
    dataSourceProperties,
  });

  const page = await notion.pages.create({
    parent: {
      data_source_id: env.NOTION_FINANCE_DATA_SOURCE_ID,
    },
    properties,
  });

  return {
    id: page.id,
    url: page.url,
    expense: cleanExpense,
    amount,
    category: cleanCategory,
  };
}
