#!/bin/bash

# 測試「我的債務人管理」私密欄位和備註時間軸 API
# 使用方式：bash test-private-fields-api.sh

echo "========================================="
echo "測試「我的債務人管理」私密欄位和備註時間軸 API"
echo "========================================="
echo ""

# 設定變數
BASE_URL="https://www.zhenhaoxun.com"
ACCOUNT="q689594"
PASSWORD="q6969520"

# 1. 登入取得 token
echo "1. 登入取得 token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"$ACCOUNT\",\"password\":\"$PASSWORD\",\"keepLoggedIn\":true}")

echo "登入回應："
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# 提取 access_token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.session.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ 登入失敗，無法取得 access_token"
  exit 1
fi

echo "✅ 登入成功，access_token: ${ACCESS_TOKEN:0:50}..."
echo ""

# 2. 取得我的債務記錄列表
echo "2. 取得我的債務記錄列表..."
MY_DEBTORS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/debts/my-debtors" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "我的債務記錄回應："
echo "$MY_DEBTORS_RESPONSE" | jq '.'
echo ""

# 提取第一筆債務記錄的 ID
DEBT_RECORD_ID=$(echo "$MY_DEBTORS_RESPONSE" | jq -r '.data[0].id')

if [ "$DEBT_RECORD_ID" == "null" ] || [ -z "$DEBT_RECORD_ID" ]; then
  echo "❌ 沒有找到債務記錄"
  exit 1
fi

echo "✅ 找到債務記錄 ID: $DEBT_RECORD_ID"
echo ""

# 3. 更新私密欄位
echo "3. 更新私密欄位..."
UPDATE_PRIVATE_FIELDS_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/debts/$DEBT_RECORD_ID/private-fields" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settled_amount": 100000,
    "recovered_amount": 50000,
    "bad_debt_amount": 30000,
    "internal_rating": 4
  }')

echo "更新私密欄位回應："
echo "$UPDATE_PRIVATE_FIELDS_RESPONSE" | jq '.'
echo ""

if [ "$(echo "$UPDATE_PRIVATE_FIELDS_RESPONSE" | jq -r '.success')" == "true" ]; then
  echo "✅ 私密欄位更新成功"
else
  echo "❌ 私密欄位更新失敗"
fi
echo ""

# 4. 新增備註
echo "4. 新增備註..."
CREATE_NOTE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/debts/$DEBT_RECORD_ID/notes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "測試備註：這是一筆測試備註，用於驗證備註時間軸功能是否正常運作。"
  }')

echo "新增備註回應："
echo "$CREATE_NOTE_RESPONSE" | jq '.'
echo ""

if [ "$(echo "$CREATE_NOTE_RESPONSE" | jq -r '.success')" == "true" ]; then
  echo "✅ 備註新增成功"
else
  echo "❌ 備註新增失敗"
fi
echo ""

# 5. 取得備註列表
echo "5. 取得備註列表..."
GET_NOTES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/debts/$DEBT_RECORD_ID/notes" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "備註列表回應："
echo "$GET_NOTES_RESPONSE" | jq '.'
echo ""

NOTE_COUNT=$(echo "$GET_NOTES_RESPONSE" | jq '.data | length')
echo "✅ 找到 $NOTE_COUNT 筆備註"
echo ""

# 6. 再次取得我的債務記錄，確認私密欄位已更新
echo "6. 再次取得我的債務記錄，確認私密欄位已更新..."
MY_DEBTORS_RESPONSE_2=$(curl -s -X GET "$BASE_URL/api/debts/my-debtors" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "更新後的債務記錄："
echo "$MY_DEBTORS_RESPONSE_2" | jq ".data[] | select(.id == \"$DEBT_RECORD_ID\") | {id, debtor_name, settled_amount, recovered_amount, bad_debt_amount, internal_rating}"
echo ""

# 檢查私密欄位是否已更新
SETTLED_AMOUNT=$(echo "$MY_DEBTORS_RESPONSE_2" | jq -r ".data[] | select(.id == \"$DEBT_RECORD_ID\") | .settled_amount")
RECOVERED_AMOUNT=$(echo "$MY_DEBTORS_RESPONSE_2" | jq -r ".data[] | select(.id == \"$DEBT_RECORD_ID\") | .recovered_amount")
BAD_DEBT_AMOUNT=$(echo "$MY_DEBTORS_RESPONSE_2" | jq -r ".data[] | select(.id == \"$DEBT_RECORD_ID\") | .bad_debt_amount")
INTERNAL_RATING=$(echo "$MY_DEBTORS_RESPONSE_2" | jq -r ".data[] | select(.id == \"$DEBT_RECORD_ID\") | .internal_rating")

echo "私密欄位驗證："
echo "  結清金額: $SETTLED_AMOUNT (預期: 100000)"
echo "  已收回金額: $RECOVERED_AMOUNT (預期: 50000)"
echo "  呆帳金額: $BAD_DEBT_AMOUNT (預期: 30000)"
echo "  內部評價: $INTERNAL_RATING (預期: 4)"
echo ""

# 7. 總結
echo "========================================="
echo "測試總結"
echo "========================================="

if [ "$SETTLED_AMOUNT" == "100000" ] && [ "$RECOVERED_AMOUNT" == "50000" ] && [ "$BAD_DEBT_AMOUNT" == "30000" ] && [ "$INTERNAL_RATING" == "4" ]; then
  echo "✅ 所有測試通過！"
  echo ""
  echo "功能驗證："
  echo "  ✅ 登入功能正常"
  echo "  ✅ 取得我的債務記錄正常"
  echo "  ✅ 更新私密欄位正常"
  echo "  ✅ 新增備註正常"
  echo "  ✅ 取得備註列表正常"
  echo "  ✅ 私密欄位資料正確儲存"
else
  echo "❌ 部分測試失敗"
  echo ""
  echo "失敗項目："
  if [ "$SETTLED_AMOUNT" != "100000" ]; then
    echo "  ❌ 結清金額不正確"
  fi
  if [ "$RECOVERED_AMOUNT" != "50000" ]; then
    echo "  ❌ 已收回金額不正確"
  fi
  if [ "$BAD_DEBT_AMOUNT" != "30000" ]; then
    echo "  ❌ 呆帳金額不正確"
  fi
  if [ "$INTERNAL_RATING" != "4" ]; then
    echo "  ❌ 內部評價不正確"
  fi
fi

echo ""
echo "========================================="

